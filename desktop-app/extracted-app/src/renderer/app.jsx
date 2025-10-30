import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { TrainerSignup } from '../onboarding/TrainerSignup.jsx';
const { ipcRenderer, clipboard } = window.require('electron');

function App() {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [trainerConfig, setTrainerConfig] = useState(null);
  const [clients, setClients] = useState([]);
  const [showEmail, setShowEmail] = useState(false);
  const [activeClient, setActiveClient] = useState(null);
  const [emailSubject, setEmailSubject] = useState('Your plan');
  const [emailBody, setEmailBody] = useState('Please find attached.');
  const [attachPdf, setAttachPdf] = useState(true);
  const [attachAvatar, setAttachAvatar] = useState(true);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const apiBase = useMemo(() => {
    // If a Worker URL is configured after onboarding, proxy API calls through it
    if (trainerConfig?.workerUrl) {
      return `${trainerConfig.workerUrl}/api`;
    }
    return 'http://localhost:8000';
  }, [trainerConfig]);

  useEffect(() => {
    // Listen for onboarding status from main process
    ipcRenderer.on('onboarding-status', (event, { isOnboarded: onboarded }) => {
      setIsOnboarded(onboarded);
      setIsLoading(false);
      if (onboarded) {
        loadTrainerConfig();
        fetchClients();
      }
    });

    return () => {
      ipcRenderer.removeAllListeners('onboarding-status');
    };
  }, []);

  async function loadTrainerConfig() {
    const config = await ipcRenderer.invoke('get-trainer-config');
    setTrainerConfig(config);
  }

  function fetchClients() {
    fetch(`${apiBase}/clients`)
      .then((r) => r.json())
      .then(setClients)
      .catch(() => setClients([]));
  }

  function openEmail(client) {
    setActiveClient(client);
    setEmailSubject('Your plan');
    setEmailBody('Please find attached.');
    setAttachPdf(true);
    setAttachAvatar(true);
    setShowEmail(true);
  }

  function createClient() {
    if (!newName || !newEmail) return;
    fetch(`${apiBase}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, email: newEmail }),
    })
      .then((r) => r.json())
      .then(() => {
        setNewName('');
        setNewEmail('');
        fetchClients();
      });
  }

  function sendEmail() {
    if (!activeClient) return;
    fetch(`${apiBase}/clients/${activeClient.id}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: emailSubject,
        body: emailBody,
        attach_pdf: attachPdf,
        attach_avatar: attachAvatar,
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        alert('Email sent: ' + JSON.stringify(res));
        setShowEmail(false);
      })
      .catch((err) => {
        alert('Failed to send email: ' + err);
        setShowEmail(false);
      });
  }

  async function shareProfile(client) {
    try {
      const resp = await fetch(`${apiBase}/clients/${client.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_email: client.email, expires_days: 30 })
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Share failed (${resp.status}): ${text}`);
      }
      const data = await resp.json();
      const url = data.share_url || data.url || '';
      if (url) {
        try { clipboard.writeText(url); } catch (_) {}
        alert(`Share link generated and copied to clipboard:\n${url}`);
      } else {
        alert('Share link generated, but missing URL in response.');
      }
    } catch (err) {
      alert('Failed to generate share link: ' + err.message);
    }
  }

  function handleOnboardingComplete(result) {
    console.log('Onboarding complete:', result);
    setIsOnboarded(true);
    loadTrainerConfig();
    fetchClients();
  }

  if (isLoading) {
    return <div style={{ padding: 20 }}>Loading FitTrack Pro...</div>;
  }

  if (!isOnboarded) {
    return <TrainerSignup onComplete={handleOnboardingComplete} />;
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <h1>FitTrack Pro - Desktop</h1>
      <p>Welcome, {trainerConfig?.name || 'Trainer'}!</p>
      <p style={{ fontSize: 12, color: '#666' }}>
        Your profile URL: {trainerConfig?.workerUrl || 'Setting up...'}
      </p>

      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <input
          placeholder="Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          placeholder="Email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          style={{ marginLeft: 8 }}
        />
        <button onClick={createClient} style={{ marginLeft: 8 }}>
          Create Client
        </button>
      </div>

      <h2>Clients</h2>
      <ul>
        {clients.map((c) => (
          <li key={c.id} style={{ marginBottom: 6 }}>
            <span>
              {c.name} &lt;{c.email}&gt;
            </span>
            <button onClick={() => openEmail(c)} style={{ marginLeft: 8 }}>
              Email
            </button>
            <button onClick={() => shareProfile(c)} style={{ marginLeft: 8 }}>
              Share Profile
            </button>
          </li>
        ))}
      </ul>

      {showEmail && (
        <div
          style={{
            position: 'fixed',
            left: 20,
            top: 20,
            right: 20,
            background: '#fff',
            border: '1px solid #ccc',
            padding: 20,
          }}
        >
          <h3>Send email to {activeClient?.name}</h3>
          <div>
            <input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              style={{ width: '80%' }}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={4}
              style={{ width: '80%' }}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={attachPdf}
                onChange={(e) => setAttachPdf(e.target.checked)}
              />{' '}
              Attach PDF
            </label>
            <label style={{ marginLeft: 12 }}>
              <input
                type="checkbox"
                checked={attachAvatar}
                onChange={(e) => setAttachAvatar(e.target.checked)}
              />{' '}
              Attach Avatar
            </label>
          </div>
          <div style={{ marginTop: 12 }}>
            <button onClick={sendEmail}>Send</button>
            <button onClick={() => setShowEmail(false)} style={{ marginLeft: 8 }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

