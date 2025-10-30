# Cloudflare Tunnel Auto-Start

## Overview
FitTrack Pro now automatically starts a Cloudflare Tunnel when the desktop application launches. This provides **zero-configuration** remote access to your local backend without requiring port forwarding or firewall changes.

## Features

### 1. **Automatic Startup**
- Cloudflare Tunnel starts automatically when you launch FitTrack Pro
- No manual configuration required
- No user interaction needed

### 2. **Public URL Generation**
- Automatically generates a public HTTPS URL (e.g., `https://abc-xyz-123.trycloudflare.com`)
- URL is stored and persists across sessions
- Changes each time the tunnel restarts

### 3. **Status Display**
- Green "🌐 Cloudflare Tunnel Active" badge in the header
- "📋 Copy URL" button to copy the tunnel URL to clipboard
- Console logs show tunnel status

### 4. **Automatic Cleanup**
- Tunnel process is killed when app closes
- Handles app quit and window close events
- No orphaned processes

## How It Works

### Main Process (main.js)
```javascript
app.whenReady().then(async () => {
  // Auto-start Cloudflare Tunnel on app launch
  tunnelProcess = spawn(cloudflaredPath, ['tunnel', '--url', 'http://localhost:8000'])
  
  // Parse tunnel URL from stdout
  tunnelProcess.stdout.on('data', (data) => {
    const match = data.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
    if (match) {
      tunnelUrl = match[0]
      store.set('cloudflare.tunnelUrl', tunnelUrl)
      
      // Send to renderer
      windows[0].webContents.send('tunnel-ready', tunnelUrl)
    }
  })
})
```

### Renderer (App.jsx)
```javascript
// Listen for tunnel ready event
ipcRenderer.on('tunnel-ready', (event, url) => {
  setTunnelUrl(url)
})

// Check for existing tunnel URL on mount
ipcRenderer.invoke('get-tunnel-url').then(url => {
  if (url) setTunnelUrl(url)
})
```

## User Experience

### On App Launch
1. FitTrack Pro opens
2. Cloudflare Tunnel starts in the background (takes 5-10 seconds)
3. Green "Tunnel Active" badge appears in header
4. Console shows: `✅ Cloudflare Tunnel started: https://...`

### Accessing Remotely
1. Click "📋 Copy URL" button in header
2. Share the URL with clients or use in web client
3. URL provides HTTPS access to your local backend

### On App Close
1. Tunnel process is automatically killed
2. No manual cleanup required
3. URL becomes invalid

## Technical Details

### cloudflared.exe Location
- **Development**: `desktop-app/cloudflared.exe`
- **Production**: `resources/cloudflared.exe` (bundled in installer)

### Fallback Paths
The app checks multiple locations for `cloudflared.exe`:
1. `process.resourcesPath/cloudflared.exe`
2. `__dirname/../../cloudflared.exe`
3. `__dirname/../../../cloudflared.exe`

### Error Handling
- If `cloudflared.exe` not found: Warning logged, app continues in local-only mode
- If tunnel fails to start: Error logged, app continues in local-only mode
- If tunnel process exits: Variables reset, no crash

### IPC Handlers
- `get-tunnel-url`: Returns current tunnel URL or stored URL
- `start-tunnel`: Manual tunnel start (still available for advanced users)

## Benefits

### For Trainers
- ✅ No technical setup required
- ✅ No port forwarding needed
- ✅ No firewall configuration
- ✅ Works from anywhere (home, office, coffee shop)
- ✅ HTTPS encryption by default

### For Clients
- ✅ Access their profile remotely
- ✅ No VPN required
- ✅ Works on any device with a browser

### For Developers
- ✅ Zero-configuration deployment
- ✅ Automatic process management
- ✅ Clean shutdown handling
- ✅ Persistent URL storage

## Limitations

### Free Tier Restrictions
- URL changes on each tunnel restart
- No custom subdomain (random hash)
- No permanent URLs (use paid Cloudflare Tunnel for that)

### Performance
- Additional latency (~50-200ms) due to Cloudflare routing
- Rate limits apply (generous for personal use)

### Availability
- Tunnel only active while desktop app is running
- If app closes, URL becomes invalid
- Clients need updated URL after restart

## Troubleshooting

### Tunnel Not Starting
**Check console logs:**
```
⚠️  cloudflared.exe not found - tunnel not started
```
**Solution:** Ensure `cloudflared.exe` is in the correct location (see locations above)

### Tunnel URL Not Appearing
**Check console logs:**
```
Tunnel startup timeout
```
**Solution:** 
- Check internet connection
- Verify cloudflared.exe is not blocked by antivirus
- Try restarting the app

### Tunnel Process Running After Quit
**Solution:** Check Task Manager, manually kill `cloudflared.exe` if orphaned

### URL Not Working
**Common causes:**
- Backend not running (port 8000)
- Tunnel restarted (URL changed)
- Firewall blocking localhost:8000

**Solution:**
- Start backend with `.\installer\build\FitTrack Pro.bat`
- Copy new URL from app header
- Check Windows Firewall settings

## Advanced Usage

### Manual Tunnel Start (IPC)
```javascript
// From renderer process
const tunnelUrl = await ipcRenderer.invoke('start-tunnel')
```

### Custom API Base
Users can still override with custom API base in Advanced settings:
- LAN: `http://192.168.1.10:8000`
- Custom tunnel: `https://your-tunnel.workers.dev/api`

## Future Enhancements

### Planned Features
- [ ] Persistent tunnel URLs (paid Cloudflare Tunnel integration)
- [ ] Custom subdomain support
- [ ] Tunnel status health checks
- [ ] Automatic URL sharing via email
- [ ] QR code for easy mobile access

### Integration Ideas
- Sync tunnel URL with central registration service
- Update Worker's BACKEND_ORIGIN automatically
- Display tunnel URL in client invite emails

## Security

### HTTPS by Default
- All Cloudflare Tunnel URLs use HTTPS
- TLS 1.2+ encryption
- No HTTP downgrade

### Authentication
- Backend still requires authentication
- Tunnel only provides transport layer
- JWT tokens used for API access

### Best Practices
- Don't share tunnel URL publicly
- Only share with trusted clients
- Monitor backend logs for suspicious activity
- Change URLs regularly (restart tunnel)

## Conclusion
Cloudflare Tunnel auto-start eliminates the biggest barrier to remote access: **configuration complexity**. Trainers can now share their backend with clients instantly, with zero technical knowledge required.

**Status: ✅ Implemented and tested**
