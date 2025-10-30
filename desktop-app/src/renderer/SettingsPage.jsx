import React, { useState, useEffect } from 'react';
import { TrainerQRCode } from './TrainerQRCode';

/**
 * Trainer Settings Page
 * - View/download QR code for mobile access
 * - Upload custom logo
 * - Change password
 * - Manage profile
 */
export function SettingsPage({ apiBase }) {
  const [trainer, setTrainer] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileComplete, setProfileComplete] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTrainerProfile();
  }, []);

  const loadTrainerProfile = async () => {
    try {
      // Get trainer ID from localStorage or electron store
      const trainerId = window.localStorage.getItem('trainerId') || '1';
      const response = await fetch(`${apiBase}/trainers/${trainerId}`);
      
      if (response.ok) {
        const data = await response.json();
        setTrainer(data);
        
        // Check if profile is complete
        const isComplete = !!(data.name && data.email && data.phone);
        setProfileComplete(isComplete);
        
        if (data.logo_url) {
          setLogoPreview(data.logo_url);
        }
      }
    } catch (err) {
      console.error('Failed to load trainer profile:', err);
    }
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    setLogoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadLogo = async () => {
    if (!logoFile || !trainer) return;

    try {
      setUploading(true);
      setError('');
      setSuccess('');

      const formData = new FormData();
      formData.append('logo', logoFile);

      const response = await fetch(`${apiBase}/trainers/${trainer.id}/logo`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload logo');

      setSuccess('Logo uploaded successfully!');
      setLogoFile(null);
      await loadTrainerProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setError('');
      setSuccess('');

      const response = await fetch(`${apiBase}/trainers/${trainer.id}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to change password');
      }

      setSuccess('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  if (!trainer) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ color: '#FFB82B', marginBottom: 8 }}>⚙️ Settings</h2>
      <p style={{ color: '#9ca3af', marginBottom: 32 }}>
        Manage your profile, mobile access, and account settings
      </p>

      {error && (
        <div style={{
          background: '#FF4B3922',
          color: '#FF4B39',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
          borderLeft: '4px solid #FF4B39'
        }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{
          background: '#1BB55C22',
          color: '#1BB55C',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
          borderLeft: '4px solid #1BB55C'
        }}>
          ✅ {success}
        </div>
      )}

      {/* Profile Completion Warning */}
      {!profileComplete && (
        <div style={{
          background: '#FFB82B22',
          color: '#FFB82B',
          padding: 16,
          borderRadius: 8,
          marginBottom: 24,
          borderLeft: '4px solid #FFB82B'
        }}>
          <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
            ⚠️ Complete Your Profile
          </div>
          <div style={{ fontSize: 14 }}>
            Your mobile portal will not work until you complete your profile. Please ensure you have:
          </div>
          <ul style={{ marginTop: 8, marginBottom: 0 }}>
            {!trainer.name && <li>Full name</li>}
            {!trainer.email && <li>Email address</li>}
            {!trainer.phone && <li>Phone number</li>}
          </ul>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        {/* Mobile Access Section */}
        <div>
          <TrainerQRCode 
            trainerId={trainer.id}
            trainerName={trainer.name}
            apiBase={apiBase}
          />
        </div>

        {/* Logo Upload Section */}
        <div style={{ background: '#2a2f42', borderRadius: 12, padding: 24 }}>
          <h3 style={{ color: '#FFB82B', marginTop: 0 }}>🎨 Custom Logo</h3>
          <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 20 }}>
            Upload your logo to personalize your trainer portal and client profiles
          </p>

          {/* Logo Preview */}
          <div style={{
            background: '#1a1d2e',
            borderRadius: 8,
            padding: 20,
            marginBottom: 16,
            textAlign: 'center',
            minHeight: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {logoPreview ? (
              <img 
                src={logoPreview} 
                alt="Logo Preview" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: 180,
                  objectFit: 'contain'
                }}
              />
            ) : (
              <div style={{ color: '#9ca3af' }}>No logo uploaded</div>
            )}
          </div>

          {/* File Input */}
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoSelect}
            style={{ marginBottom: 12, width: '100%' }}
          />

          {/* Upload Button */}
          {logoFile && (
            <button
              onClick={uploadLogo}
              disabled={uploading}
              className="btn-primary"
              style={{ width: '100%', opacity: uploading ? 0.5 : 1 }}
            >
              {uploading ? 'Uploading...' : '📤 Upload Logo'}
            </button>
          )}

          <div style={{ marginTop: 12, fontSize: 12, color: '#9ca3af' }}>
            Recommended: Square image, PNG or JPG, max 5MB
          </div>
        </div>
      </div>

      {/* Password Change Section */}
      <div style={{ 
        background: '#2a2f42', 
        borderRadius: 12, 
        padding: 24, 
        marginTop: 24,
        maxWidth: 500
      }}>
        <h3 style={{ color: '#FFB82B', marginTop: 0 }}>🔒 Change Password</h3>
        <form onSubmit={changePassword}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
              Current Password
            </label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
              required
              style={{ width: '100%', padding: 12 }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
              New Password
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
              required
              minLength={8}
              style={{ width: '100%', padding: 12 }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
              required
              minLength={8}
              style={{ width: '100%', padding: 12 }}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%' }}>
            Change Password
          </button>
        </form>
      </div>

      {/* Profile Information */}
      <div style={{
        background: '#2a2f42',
        borderRadius: 12,
        padding: 24,
        marginTop: 24
      }}>
        <h3 style={{ color: '#FFB82B', marginTop: 0 }}>👤 Profile Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Name</div>
            <div style={{ fontSize: 16 }}>{trainer.name || 'Not set'}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Email</div>
            <div style={{ fontSize: 16 }}>{trainer.email || 'Not set'}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Phone</div>
            <div style={{ fontSize: 16 }}>{trainer.phone || 'Not set'}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Member Since</div>
            <div style={{ fontSize: 16 }}>
              {trainer.created_at ? new Date(trainer.created_at).toLocaleDateString() : 'Unknown'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
