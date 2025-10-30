import React, { useState, useEffect } from 'react';

/**
 * Email Settings Component
 * Allows trainer to configure SMTP email settings for sending workout plans, meal plans, and reports
 */
export function EmailSettings({ apiBase, onClose }) {
  const [config, setConfig] = useState({
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    from_name: 'FitTrack Pro'
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const resp = await fetch(`${apiBase}/settings/email`);
      if (resp.ok) {
        const data = await resp.json();
        if (data) {
          setConfig({
            smtp_host: data.smtp_host || 'smtp.gmail.com',
            smtp_port: data.smtp_port || '587',
            smtp_user: data.smtp_user || '',
            smtp_password: '', // Don't load password for security
            from_email: data.from_email || '',
            from_name: data.from_name || 'FitTrack Pro'
          });
        }
      }
    } catch (e) {
      console.error('Failed to load email settings:', e);
    }
  }

  async function saveSettings() {
    setLoading(true);
    setMessage('');
    try {
      const resp = await fetch(`${apiBase}/settings/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!resp.ok) throw new Error('Failed to save settings');
      
      setMessage('✅ Email settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      setMessage(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function testEmail() {
    if (!config.smtp_user || !config.smtp_password) {
      alert('Please enter your email and password first');
      return;
    }

    setTesting(true);
    setMessage('');
    try {
      const resp = await fetch(`${apiBase}/settings/email/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_email: config.smtp_user,
          ...config
        })
      });

      if (!resp.ok) throw new Error('Test email failed');
      
      setMessage(`✅ Test email sent to ${config.smtp_user}! Check your inbox.`);
    } catch (e) {
      setMessage(`❌ Test failed: ${e.message}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{ 
        backgroundColor: '#1a1d2e', 
        borderRadius: 8, 
        padding: 24, 
        maxWidth: 600,
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Email Settings</h2>
          <button onClick={onClose} style={{ fontSize: '24px', padding: '0 8px' }}>×</button>
        </div>

        <div className="small" style={{ marginBottom: 16, padding: 12, backgroundColor: '#2a2f4c', borderRadius: 4 }}>
          <strong>📧 Gmail Setup Instructions:</strong>
          <ol style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
            <li>Go to your Google Account settings</li>
            <li>Enable 2-Step Verification</li>
            <li>Generate an App Password (Security → App Passwords)</li>
            <li>Use your Gmail address and the 16-character app password below</li>
          </ol>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label>SMTP Server</label>
            <input 
              type="text"
              value={config.smtp_host}
              onChange={e => setConfig({...config, smtp_host: e.target.value})}
              placeholder="smtp.gmail.com"
            />
            <div className="small">For Gmail: smtp.gmail.com | Outlook: smtp-mail.outlook.com</div>
          </div>

          <div>
            <label>SMTP Port</label>
            <input 
              type="number"
              value={config.smtp_port}
              onChange={e => setConfig({...config, smtp_port: e.target.value})}
              placeholder="587"
            />
            <div className="small">Usually 587 (TLS) or 465 (SSL)</div>
          </div>

          <div>
            <label>Your Email Address</label>
            <input 
              type="email"
              value={config.smtp_user}
              onChange={e => setConfig({...config, smtp_user: e.target.value, from_email: e.target.value})}
              placeholder="yourname@gmail.com"
            />
          </div>

          <div>
            <label>Password / App Password</label>
            <input 
              type="password"
              value={config.smtp_password}
              onChange={e => setConfig({...config, smtp_password: e.target.value})}
              placeholder="Enter your app password"
            />
            <div className="small">For Gmail, use a 16-character App Password, not your regular password</div>
          </div>

          <div>
            <label>From Name (Display Name)</label>
            <input 
              type="text"
              value={config.from_name}
              onChange={e => setConfig({...config, from_name: e.target.value})}
              placeholder="FitTrack Pro"
            />
          </div>
        </div>

        {message && (
          <div style={{ 
            marginTop: 16, 
            padding: 12, 
            backgroundColor: message.includes('✅') ? '#1BB55C22' : '#FF4B3922',
            borderRadius: 4,
            color: message.includes('✅') ? '#1BB55C' : '#FF4B39'
          }}>
            {message}
          </div>
        )}

        <div className="row" style={{ marginTop: 16, gap: 8 }}>
          <button 
            className="btn-primary" 
            onClick={saveSettings}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
          <button 
            onClick={testEmail}
            disabled={testing || !config.smtp_user || !config.smtp_password}
          >
            {testing ? 'Sending...' : 'Send Test Email'}
          </button>
          <button onClick={onClose} style={{ marginLeft: 'auto' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
