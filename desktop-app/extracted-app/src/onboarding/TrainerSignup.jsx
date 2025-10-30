import React, { useState } from 'react';
import './TrainerSignup.css';

export const TrainerSignup = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState('');

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) newErrors.email = 'Valid email required';
    if (!formData.phone.match(/^\+?[\d\s-()]+$/)) newErrors.phone = 'Valid phone required';
    if (formData.password.length < 8) newErrors.password = 'Password must be 8+ characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords must match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      handleDeploy();
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setStep(2);

    try {
      // Step 1: Save trainer credentials locally (encrypted)
      setDeploymentStatus('Saving your information securely...');
      const { ipcRenderer } = window.require('electron');
      
      await ipcRenderer.invoke('save-trainer-config', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password, // Will be hashed in main process
      });

      // Step 2: Register with central service and deploy Worker
      setDeploymentStatus('Creating your cloud profile...');
      const registrationResult = await ipcRenderer.invoke('register-trainer', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      });

      const { trainer_id, worker_url, kv_namespace_id } = registrationResult;

      // Step 3: Start tunnel
      setDeploymentStatus('Starting secure tunnel...');
      const tunnelUrl = await ipcRenderer.invoke('start-tunnel');

      // Step 4: Update Worker with tunnel URL
      setDeploymentStatus('Connecting to your local server...');
      await ipcRenderer.invoke('update-worker-tunnel', {
        trainer_id,
        tunnel_url: tunnelUrl
      });

      setDeploymentStatus('✓ Setup complete!');
      
      // Wait 2 seconds to show success, then complete onboarding
      setTimeout(() => {
        onComplete({
          workerUrl: worker_url,
          tunnelUrl,
          trainerName: formData.name
        });
      }, 2000);

    } catch (error) {
      setDeploymentStatus(`❌ Error: ${error.message}`);
      setIsDeploying(false);
    }
  };

  return (
    <div className="trainer-signup">
      {step === 1 && (
        <div className="signup-step">
          <h1>Welcome to FitTrack Pro</h1>
          <p>Let's set up your trainer account</p>
          
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="John Smith"
            />
            {errors.name && <span className="error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="john@example.com"
            />
            {errors.email && <span className="error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="+1 (555) 123-4567"
            />
            {errors.phone && <span className="error">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label>Password (stored locally, encrypted)</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Minimum 8 characters"
            />
            {errors.password && <span className="error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              placeholder="Re-enter password"
            />
            {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
          </div>

          <div className="info-box" style={{ marginTop: 20 }}>
            <h3>What happens next?</h3>
            <ul>
              <li>✓ Your data stays on your computer (local database)</li>
              <li>✓ We'll create a shareable profile URL for your clients</li>
              <li>✓ No additional accounts or setup needed</li>
              <li>✓ Everything happens automatically!</li>
            </ul>
          </div>

          <button className="btn-primary" onClick={handleNext}>
            Complete Setup
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="signup-step deployment">
          <h1>{isDeploying ? 'Setting Up...' : 'Ready!'}</h1>
          
          <div className="deployment-status">
            {isDeploying && <div className="spinner"></div>}
            <p className="status-text">{deploymentStatus}</p>
          </div>

          {!isDeploying && deploymentStatus.startsWith('✓') && (
            <div className="success-box">
              <h3>Your FitTrack Pro is ready!</h3>
              <p>Your profile URL: <code>fittrack-{formData.name.toLowerCase().replace(/\s+/g, '')}.workers.dev</code></p>
            </div>
          )}

          {!isDeploying && deploymentStatus.startsWith('❌') && (
            <button className="btn-primary" onClick={() => setStep(2)}>
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
};
