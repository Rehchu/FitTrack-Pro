require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const REGISTRATION_SECRET = process.env.REGISTRATION_SECRET;

// In-memory store (use database in production)
const trainers = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', trainers: trainers.size });
});

// Register a new trainer and deploy their Worker
app.post('/register', async (req, res) => {
  try {
    const { trainer_name, trainer_email, trainer_phone, registration_secret } = req.body;

    // Verify secret
    if (registration_secret !== REGISTRATION_SECRET) {
      return res.status(401).json({ error: 'Invalid registration secret' });
    }

    // Validate input
    if (!trainer_name || !trainer_email) {
      return res.status(400).json({ error: 'trainer_name and trainer_email required' });
    }

    // Generate trainer ID and Worker name
    const trainerId = uuidv4();
    const workerName = `fittrack-${trainer_name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    console.log(`Registering trainer: ${trainer_name} (${trainerId})`);

    // Step 1: Create KV namespace
    console.log('Creating KV namespace...');
    const kvResponse = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces`,
      { title: `${workerName}-kv` },
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!kvResponse.data.success) {
      throw new Error('KV creation failed: ' + JSON.stringify(kvResponse.data.errors));
    }

    const kvNamespaceId = kvResponse.data.result.id;
    console.log(`KV namespace created: ${kvNamespaceId}`);

    // Step 2: Deploy Worker
    console.log('Deploying Worker...');
    const workerScript = generateWorkerScript();

    const deployResponse = await axios.put(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerName}`,
      workerScript,
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/javascript'
        }
      }
    );

    if (!deployResponse.data.success) {
      throw new Error('Worker deployment failed: ' + JSON.stringify(deployResponse.data.errors));
    }

    console.log('Worker deployed successfully');

    // Step 3: Bind KV namespace
    console.log('Binding KV namespace...');
    await axios.put(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerName}/bindings`,
      {
        bindings: [
          {
            type: 'kv_namespace',
            name: 'FITTRACK_KV',
            namespace_id: kvNamespaceId
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('KV namespace bound');

    // Step 4: Enable workers.dev subdomain
    console.log('Enabling workers.dev subdomain...');
    try {
      await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerName}/subdomain`,
        { enabled: true },
        {
          headers: {
            'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (subdomainError) {
      // Subdomain might already be enabled, ignore error
      console.log('Subdomain enable skipped (may already be enabled)');
    }

    const workerUrl = `https://${workerName}.workers.dev`;
    console.log(`Worker URL: ${workerUrl}`);

    // Store trainer info
    trainers.set(trainerId, {
      id: trainerId,
      name: trainer_name,
      email: trainer_email,
      phone: trainer_phone,
      worker_name: workerName,
      worker_url: workerUrl,
      kv_namespace_id: kvNamespaceId,
      tunnel_url: null,
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      trainer_id: trainerId,
      worker_url: workerUrl,
      kv_namespace_id: kvNamespaceId,
      message: 'Trainer registered and Worker deployed successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      details: error.response?.data?.errors || error.message
    });
  }
});

// Update trainer's tunnel URL in their Worker
app.post('/update-tunnel', async (req, res) => {
  try {
    const { trainer_id, tunnel_url, registration_secret } = req.body;

    // Verify secret
    if (registration_secret !== REGISTRATION_SECRET) {
      return res.status(401).json({ error: 'Invalid registration secret' });
    }

    // Validate input
    if (!trainer_id || !tunnel_url) {
      return res.status(400).json({ error: 'trainer_id and tunnel_url required' });
    }

    const trainer = trainers.get(trainer_id);
    if (!trainer) {
      return res.status(404).json({ error: 'Trainer not found' });
    }

    console.log(`Updating tunnel for ${trainer.name}: ${tunnel_url}`);

    // Update Worker environment variable
    await axios.put(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${trainer.worker_name}/settings`,
      {
        bindings: [
          {
            type: 'plain_text',
            name: 'BACKEND_ORIGIN',
            text: tunnel_url
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Update stored tunnel URL
    trainer.tunnel_url = tunnel_url;
    trainer.last_tunnel_update = new Date().toISOString();
    trainers.set(trainer_id, trainer);

    console.log('Tunnel URL updated successfully');

    res.json({
      success: true,
      message: 'Tunnel URL updated',
      worker_url: trainer.worker_url
    });

  } catch (error) {
    console.error('Tunnel update error:', error);
    res.status(500).json({
      error: 'Tunnel update failed',
      details: error.response?.data?.errors || error.message
    });
  }
});

// Get trainer info
app.get('/trainer/:trainer_id', (req, res) => {
  const trainer = trainers.get(req.params.trainer_id);
  if (!trainer) {
    return res.status(404).json({ error: 'Trainer not found' });
  }

  // Don't expose internal IDs
  const { kv_namespace_id, ...publicInfo } = trainer;
  res.json(publicInfo);
});

// List all trainers (admin only - add auth in production)
app.get('/trainers', (req, res) => {
  const trainerList = Array.from(trainers.values()).map(t => ({
    id: t.id,
    name: t.name,
    email: t.email,
    worker_url: t.worker_url,
    created_at: t.created_at
  }));
  res.json({ trainers: trainerList });
});

// Generate Worker script
function generateWorkerScript() {
  // Read the worker template
  const templatePath = path.join(__dirname, 'worker-template.js');
  return fs.readFileSync(templatePath, 'utf8');
}

app.listen(PORT, () => {
  console.log(`FitTrack Central Registration API running on port ${PORT}`);
  console.log(`Cloudflare Account: ${CLOUDFLARE_ACCOUNT_ID}`);
  console.log(`Registration secret: ${REGISTRATION_SECRET ? '✓ Set' : '✗ Missing'}`);
});
