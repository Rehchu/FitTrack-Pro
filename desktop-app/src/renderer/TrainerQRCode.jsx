import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';

/**
 * QR Code Component for Trainer Mobile Access
 * Generates a unique QR code that trainers can scan to access their web portal
 */
export function TrainerQRCode({ trainerId, trainerName, apiBase }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => {
    generateQRCode();
  }, [trainerId, trainerName]);

  const generateQRCode = async () => {
    if (!trainerId || !trainerName) return;

    // Generate unique trainer portal URL
    const friendlyName = trainerName.replace(/\s+/g, '').toLowerCase();
    const url = `https://fittrack-pro-desktop.rehchu1.workers.dev/trainer/${friendlyName}`;
    setPortalUrl(url);

    try {
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1a1d2e',
          light: '#ffffff',
        },
      });
      setQrCodeUrl(qrDataUrl);

      // Also draw on canvas for higher quality
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, url, {
          width: 300,
          margin: 2,
          color: {
            dark: '#1a1d2e',
            light: '#ffffff',
          },
        });
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(portalUrl);
    alert('Portal URL copied to clipboard!');
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.download = `fittrack-qr-${trainerName.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  return (
    <div style={{
      background: '#2a2f42',
      borderRadius: 12,
      padding: 24,
      textAlign: 'center',
      maxWidth: 400,
      margin: '0 auto'
    }}>
      <h3 style={{ color: '#FFB82B', marginTop: 0 }}>📱 Your Mobile Portal</h3>
      <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 20 }}>
        Scan this QR code with your phone to access your trainer dashboard on the go
      </p>

      {/* QR Code Display */}
      <div style={{
        background: 'white',
        padding: 20,
        borderRadius: 12,
        marginBottom: 16,
        display: 'inline-block'
      }}>
        {qrCodeUrl ? (
          <img src={qrCodeUrl} alt="Trainer Portal QR Code" style={{ display: 'block' }} />
        ) : (
          <div style={{ width: 300, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: '#9ca3af' }}>Generating QR code...</div>
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {/* Portal URL */}
      <div style={{
        background: '#1a1d2e',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        fontSize: 13,
        color: '#e5e7eb',
        wordBreak: 'break-all'
      }}>
        {portalUrl || 'Generating URL...'}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button
          onClick={copyToClipboard}
          disabled={!portalUrl}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: '1px solid #3a3f52',
            background: '#3a3f52',
            color: '#e5e7eb',
            cursor: portalUrl ? 'pointer' : 'not-allowed',
            fontSize: 14,
            opacity: portalUrl ? 1 : 0.5
          }}
        >
          📋 Copy URL
        </button>
        <button
          onClick={downloadQRCode}
          disabled={!qrCodeUrl}
          className="btn-primary"
          style={{
            padding: '10px 20px',
            fontSize: 14,
            opacity: qrCodeUrl ? 1 : 0.5
          }}
        >
          💾 Download QR
        </button>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: 20,
        padding: 16,
        background: '#FFB82B22',
        borderRadius: 8,
        borderLeft: '4px solid #FFB82B'
      }}>
        <div style={{ fontSize: 13, color: '#FFB82B', fontWeight: 'bold', marginBottom: 8 }}>
          📖 How to Use
        </div>
        <ol style={{ fontSize: 12, color: '#e5e7eb', textAlign: 'left', margin: 0, paddingLeft: 20 }}>
          <li style={{ marginBottom: 4 }}>Open your phone's camera app</li>
          <li style={{ marginBottom: 4 }}>Point it at the QR code above</li>
          <li style={{ marginBottom: 4 }}>Tap the notification to open your portal</li>
          <li>Login with your desktop credentials</li>
        </ol>
      </div>

      {/* Security Note */}
      <div style={{ marginTop: 12, fontSize: 11, color: '#9ca3af', opacity: 0.8 }}>
        🔒 This QR code is unique to you. Keep it secure.
      </div>
    </div>
  );
}
