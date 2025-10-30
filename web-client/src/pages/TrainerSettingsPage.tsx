import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Alert,
  Snackbar,
  IconButton,
  InputAdornment,
  Divider,
  Grid,
  Card,
  CardContent,
  CardMedia
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CloudUpload,
  Save,
  QrCode2,
  ContentCopy,
  Download
} from '@mui/icons-material';

const TRAINER_ID = 1; // For production testing
const API_BASE = 'https://fittrack-pro-desktop.rehchu1.workers.dev/api';

export function TrainerSettingsPage() {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });

  useEffect(() => {
    // Generate QR code and profile URL on mount
    const trainerUrl = `https://fittrack-pro-desktop.rehchu1.workers.dev/trainer/${TRAINER_ID}`;
    setProfileUrl(trainerUrl);
    
    // Use Google Charts API for QR code generation
    const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(trainerUrl)}`;
    setQrCodeUrl(qrUrl);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setSnackbar({ open: true, message: 'Copied to clipboard!', severity: 'success' });
    }).catch(() => {
      setSnackbar({ open: true, message: 'Failed to copy', severity: 'error' });
    });
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `trainer-${TRAINER_ID}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSnackbar({ open: true, message: 'Logo must be less than 5MB', severity: 'error' });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setSnackbar({ open: true, message: 'Please select an image file', severity: 'error' });
      return;
    }

    setLogo(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogo = async () => {
    if (!logo) {
      setSnackbar({ open: true, message: 'Please select a logo first', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('logo', logo);

      const response = await fetch(
        `${API_BASE}/trainers/${TRAINER_ID}/profile`,
        {
          method: 'PUT',
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload logo');
      }

      const data = await response.json();
      setSnackbar({ open: true, message: 'Logo uploaded successfully! ✅', severity: 'success' });
      setLogo(null);
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: error instanceof Error ? error.message : 'Failed to upload logo', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setSnackbar({ open: true, message: 'Please fill in all password fields', severity: 'error' });
      return;
    }

    if (newPassword.length < 8) {
      setSnackbar({ open: true, message: 'New password must be at least 8 characters', severity: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setSnackbar({ open: true, message: 'New passwords do not match', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/trainers/${TRAINER_ID}/password`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
      }

      setSnackbar({ open: true, message: 'Password changed successfully! ✅', severity: 'success' });
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: error instanceof Error ? error.message : 'Failed to change password', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
        Trainer Settings
      </Typography>

      <Grid container spacing={3}>
        {/* QR Code Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <QrCode2 /> Mobile Portal QR Code
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Box sx={{ textAlign: 'center' }}>
              {qrCodeUrl && (
                <Card sx={{ maxWidth: 320, mx: 'auto', mb: 3 }}>
                  <CardMedia
                    component="img"
                    image={qrCodeUrl}
                    alt="Trainer Portal QR Code"
                    sx={{ p: 2 }}
                  />
                  <CardContent>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Scan this code with a mobile device
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Download />}
                      onClick={downloadQRCode}
                      fullWidth
                    >
                      Download QR Code
                    </Button>
                  </CardContent>
                </Card>
              )}

              <TextField
                fullWidth
                label="Your Portal URL"
                value={profileUrl}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => copyToClipboard(profileUrl)} edge="end">
                        <ContentCopy />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <Alert severity="info" sx={{ textAlign: 'left' }}>
                Share this QR code or URL with clients to give them access to your mobile portal.
                Works globally via Cloudflare edge network!
              </Alert>
            </Box>
          </Paper>
        </Grid>

        {/* Logo Upload Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CloudUpload /> Logo Upload
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Avatar
                src={logoPreview || undefined}
                sx={{
                  width: 150,
                  height: 150,
                  mx: 'auto',
                  mb: 2,
                  border: '3px solid',
                  borderColor: 'primary.main',
                }}
              >
                FT
              </Avatar>

              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUpload />}
                sx={{ mb: 2 }}
              >
                Select Logo
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleLogoChange}
                />
              </Button>

              <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 2 }}>
                Maximum file size: 5MB. Supported formats: PNG, JPG, GIF
              </Typography>

              {logo && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Logo selected: {logo.name}
                </Alert>
              )}
            </Box>

            <Button
              variant="contained"
              fullWidth
              onClick={handleSaveLogo}
              disabled={!logo || loading}
              startIcon={<Save />}
            >
              {loading ? 'Uploading...' : 'Save Logo'}
            </Button>

            <Alert severity="info" sx={{ mt: 2 }}>
              Logo is optional. Your profile can be completed without it!
            </Alert>
          </Paper>
        </Grid>

        {/* Password Change Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Change Password
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Current Password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          edge="end"
                        >
                          {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  helperText="Must be at least 8 characters"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          edge="end"
                        >
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={confirmPassword !== '' && newPassword !== confirmPassword}
                  helperText={
                    confirmPassword !== '' && newPassword !== confirmPassword
                      ? 'Passwords do not match'
                      : ' '
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={handlePasswordChange}
                  disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  startIcon={<Save />}
                >
                  {loading ? 'Changing Password...' : 'Change Password'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
