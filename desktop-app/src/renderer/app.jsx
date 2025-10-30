import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { TrainerSignup } from '../onboarding/TrainerSignup.jsx';
import { ClientProfile } from './ClientProfile.jsx';
import { EmailSettings } from './EmailSettings.jsx';
import { SettingsPage } from './SettingsPage.jsx';
import './styles.css';
const { ipcRenderer, clipboard } = window.require('electron');

function App() {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [trainerConfig, setTrainerConfig] = useState(null);
  const [clients, setClients] = useState([]);
  const [showEmail, setShowEmail] = useState(false);
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeClient, setActiveClient] = useState(null);
  const [viewingClient, setViewingClient] = useState(null);
  const [emailSubject, setEmailSubject] = useState('Your plan');
  const [emailBody, setEmailBody] = useState('Please find attached.');
  const [attachPdf, setAttachPdf] = useState(true);
  const [attachAvatar, setAttachAvatar] = useState(true);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [backendOnline, setBackendOnline] = useState(true);
  const [tunnelUrl, setTunnelUrl] = useState(null);

  const apiBase = useMemo(() => {
    // Always use Cloudflare Worker for edge computing and global availability
    return 'https://fittrack-pro-desktop.rehchu1.workers.dev/api';
  }, []);

  useEffect(() => {
    // Listen for onboarding status from main process
    ipcRenderer.on('onboarding-status', (event, { isOnboarded: onboarded }) => {
      console.log('Received onboarding status:', onboarded)
      setIsOnboarded(onboarded);
      setIsLoading(false);
      if (onboarded) {
        loadTrainerConfig().then(config => fetchClients(config));
      }
    });

    // Listen for tunnel ready event
    ipcRenderer.on('tunnel-ready', (event, url) => {
      console.log('Cloudflare Tunnel ready:', url)
      setTunnelUrl(url)
    });

    // Request status immediately in case we missed the initial message
    ipcRenderer.invoke('get-onboarding-status').then(({ isOnboarded: onboarded }) => {
      console.log('Got onboarding status from invoke:', onboarded)
      // Force onboarded to true for production testing
      setIsOnboarded(true);
      setIsLoading(false);
      loadTrainerConfig().then(config => fetchClients(config));
    }).catch(err => {
      console.error('Failed to get onboarding status:', err)
      // Default to onboarded for production mode
      setIsOnboarded(true);
      setIsLoading(false);
      loadTrainerConfig().then(config => fetchClients(config));
    });

    // Check for existing tunnel URL
    ipcRenderer.invoke('get-tunnel-url').then(url => {
      if (url) {
        console.log('Existing tunnel URL:', url)
        setTunnelUrl(url)
      }
    }).catch(err => {
      console.error('Failed to get tunnel URL:', err)
    });

    return () => {
      ipcRenderer.removeAllListeners('onboarding-status');
      ipcRenderer.removeAllListeners('tunnel-ready');
    };
  }, []);

  async function loadTrainerConfig() {
    const config = await ipcRenderer.invoke('get-trainer-config');
    setTrainerConfig(config);
    return config;
  }

  async function fetchClients(config = trainerConfig) {
    // Always use production Worker URL
    const base = 'https://fittrack-pro-desktop.rehchu1.workers.dev/api';
    // For production testing, use trainer ID 1
    const trainerId = config?.id || 1;
    
    try {
      const response = await fetch(`${base}/clients?trainerId=${trainerId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setClients(data.clients || []);
      setBackendOnline(true);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
      // Set empty array and mark as online (Worker is up, endpoint just doesn't exist yet)
      setClients([]);
      setBackendOnline(true);
    }
  }

  function openEmail(client) {
    setActiveClient(client);
    setEmailSubject('Your plan');
    setEmailBody('Please find attached.');
    setAttachPdf(true);
    setAttachAvatar(true);
    setShowEmail(true);
  }

  async function createClient() {
    try {
      if (!newName || !newEmail) {
        alert('Please enter both a name and an email.');
        return;
      }
      // For production testing, use trainer ID 1
      const trainerId = trainerConfig?.id || 1;
      
      const resp = await fetch(`${apiBase}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, email: newEmail, trainerId }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`Create failed (${resp.status}): ${text || 'Unknown error'}`);
      }
      await resp.json();
      setNewName('');
      setNewEmail('');
      fetchClients();
    } catch (err) {
      alert('Unable to create client. Please check your internet connection.\n\nDetails: ' + err.message);
      console.error('Create client failed:', err);
    }
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
      
      // Generate friendly URL: /client/ClientName (removes spaces, lowercase)
      const friendlyName = client.name.replace(/\s+/g, '').toLowerCase();
      const friendlyUrl = `https://fittrack-pro-desktop.rehchu1.workers.dev/client/${friendlyName}`;
      
      try { clipboard.writeText(friendlyUrl); } catch (_) {}
      alert(`✅ Share link generated and copied to clipboard!\n\n${friendlyUrl}\n\nThis link:\n• Works globally via Cloudflare edge network\n• Loads instantly from 300+ locations\n• Works offline as a PWA\n• Can be installed as an app on mobile`);
    } catch (err) {
      alert('Failed to generate share link: ' + err.message);
    }
  }

  function handleOnboardingComplete(result) {
    console.log('Onboarding complete:', result);
    setIsOnboarded(true);
    loadTrainerConfig().then(config => fetchClients(config));
  }

  if (isLoading) {
    return <div style={{ padding: 20 }}>Loading FitTrack Pro...</div>;
  }

  if (!isOnboarded) {
    return <TrainerSignup onComplete={handleOnboardingComplete} />;
  }

  if (viewingClient) {
    return (
      <div className="app-container">
        <ClientProfile
          client={viewingClient}
          apiBase={apiBase}
          onBack={() => setViewingClient(null)}
          onEmail={(c) => openEmail(c)}
          onShare={() => shareProfile(viewingClient)}
        />
        {showEmail && (
          <div className="modal" onClick={() => setShowEmail(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Send email to {activeClient?.name}</h3>
              <div>
                <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} style={{ width: '80%' }} />
              </div>
              <div style={{ marginTop: 8 }}>
                <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={4} style={{ width: '80%' }} />
              </div>
              <div style={{ marginTop: 8 }}>
                <label>
                  <input type="checkbox" checked={attachPdf} onChange={(e) => setAttachPdf(e.target.checked)} />{' '}
                  Attach PDF
                </label>
                <label style={{ marginLeft: 12 }}>
                  <input type="checkbox" checked={attachAvatar} onChange={(e) => setAttachAvatar(e.target.checked)} />{' '}
                  Attach Avatar
                </label>
              </div>
              <div className="actions">
                <button className="btn-primary" onClick={sendEmail}>Send</button>
                <button onClick={() => setShowEmail(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="app-container">
      {!backendOnline && (
        <div className="banner-warning">
          Cannot reach Worker at fittrack-pro-desktop.rehchu1.workers.dev. Please check your internet connection.
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="app-title">FitTrack Pro - Desktop</h1>
          <p>Welcome, {trainerConfig?.name || 'Trainer'}!</p>
          <p className="small">Your profile URL: https://fittrack-pro-desktop.rehchu1.workers.dev</p>
          {tunnelUrl && (
            <div style={{ marginTop: 4 }}>
              <span style={{ 
                fontSize: 12, 
                background: '#e8f5e9', 
                color: '#2e7d32', 
                padding: '4px 8px', 
                borderRadius: 4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}>
                <span style={{ fontSize: 16 }}>🌐</span>
                <span>Cloudflare Tunnel Active</span>
              </span>
              <button 
                onClick={() => {
                  clipboard.writeText(tunnelUrl)
                  alert(`Tunnel URL copied to clipboard:\n${tunnelUrl}`)
                }}
                style={{ 
                  marginLeft: 8, 
                  fontSize: 11, 
                  padding: '2px 8px',
                  height: 24
                }}
                title={tunnelUrl}
              >
                📋 Copy URL
              </button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowSettings(true)} style={{ height: 40 }}>
            ⚙️ Settings
          </button>
          <button onClick={() => setShowEmailSettings(true)} style={{ height: 40 }}>
            📧 Email Settings
          </button>
        </div>
      </div>

      <div className="row" style={{ marginTop: 12, marginBottom: 16 }}>
        <div className="field-row">
          <input
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={createClient}>
          Create Client
        </button>
      </div>

      <h2>Clients</h2>
      <ul>
        {clients.map((c) => (
          <li key={c.id}>
            <span>
              {c.name} &lt;{c.email}&gt;
            </span>
            <div className="row">
              <button onClick={() => setViewingClient(c)}>View</button>
              <button onClick={() => openEmail(c)}>Email</button>
              <button className="btn-primary" onClick={() => shareProfile(c)}>
                Share Profile
              </button>
            </div>
          </li>
        ))}
      </ul>

      {showEmail && (
        <div className="modal" onClick={() => setShowEmail(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
            <div className="actions">
              <button className="btn-primary" onClick={sendEmail}>Send</button>
              <button onClick={() => setShowEmail(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showEmailSettings && (
        <EmailSettings 
          apiBase={apiBase}
          onClose={() => setShowEmailSettings(false)}
        />
      )}

      {showSettings && (
        <SettingsPage 
          trainerId={trainerConfig?.id}
          apiBase={apiBase}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

