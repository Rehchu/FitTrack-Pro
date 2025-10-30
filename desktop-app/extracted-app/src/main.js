const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const Store = require('electron-store')
const bcrypt = require('bcrypt')
const axios = require('axios')
const { spawn } = require('child_process')
const fs = require('fs')

// Secure encrypted storage for trainer credentials
const store = new Store({
  encryptionKey: 'fittrack-pro-secure-key-change-in-production'
})

// Central registration service URL (change this to your deployed service)
const CENTRAL_API_URL = process.env.CENTRAL_API_URL || 'http://localhost:3001'
const REGISTRATION_SECRET = process.env.REGISTRATION_SECRET || 'dev-secret-change-me'

// Track tunnel process
let tunnelProcess = null
let tunnelUrl = null

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // In production, the renderer is built by Vite and lives in dist/
  // In development, it's served from src/renderer/
  const isDev = !app.isPackaged
  const rendererPath = isDev 
    ? path.join(__dirname, 'renderer', 'index.html')
    : path.join(__dirname, '..', 'dist', 'index.html')

  console.log(`Loading renderer from: ${rendererPath}`)
  console.log(`App packaged: ${app.isPackaged}`)
  console.log(`__dirname: ${__dirname}`)
  console.log(`File exists: ${require('fs').existsSync(rendererPath)}`)

  win.loadFile(rendererPath).catch(err => {
    console.error('Failed to load renderer:', err)
  })

  // Open DevTools in development
  if (isDev) {
    win.webContents.openDevTools()
  }

  // Log renderer errors
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`)
  })

  win.webContents.on('crashed', () => {
    console.error('Renderer process crashed!')
  })

  win.webContents.on('unresponsive', () => {
    console.error('Renderer process unresponsive!')
  })

  // Check if trainer has completed onboarding
  const isOnboarded = store.get('trainer.onboarded', false)

  // Send onboarding status to renderer
  win.webContents.on('did-finish-load', () => {
    console.log('Renderer finished loading')
    win.webContents.send('onboarding-status', { isOnboarded })
  })

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Failed to load: ${errorCode} - ${errorDescription}`)
  })
}

// Save trainer configuration securely
ipcMain.handle('save-trainer-config', async (event, config) => {
  try {
    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(config.password, 10)

    // Save to encrypted store
    store.set('trainer', {
      name: config.name,
      email: config.email,
      phone: config.phone,
      passwordHash: hashedPassword,
      onboarded: false // Will be set to true after full deployment
    })

    return { success: true }
  } catch (error) {
    throw new Error(`Failed to save config: ${error.message}`)
  }
})

// Register trainer via central API
ipcMain.handle('register-trainer', async (event, { name, email, phone }) => {
  try {
    console.log('Registering trainer with central service...')
    
    const response = await axios.post(`${CENTRAL_API_URL}/register`, {
      trainer_name: name,
      trainer_email: email,
      trainer_phone: phone,
      registration_secret: REGISTRATION_SECRET
    })

    if (!response.data.success) {
      throw new Error('Registration failed')
    }

    const { trainer_id, worker_url, kv_namespace_id } = response.data

    // Save registration info
    const trainer = store.get('trainer')
    store.set('trainer', {
      ...trainer,
      trainerId: trainer_id,
      workerUrl: worker_url,
      kvNamespaceId: kv_namespace_id
    })

    console.log(`Trainer registered: ${trainer_id}`)
    console.log(`Worker URL: ${worker_url}`)

    return { trainer_id, worker_url, kv_namespace_id }
  } catch (error) {
    throw new Error(`Registration failed: ${error.response?.data?.details || error.message}`)
  }
})

// Start cloudflared tunnel
ipcMain.handle('start-tunnel', async () => {
  try {
    return new Promise((resolve, reject) => {
      const cloudflaredPath = path.join(__dirname, '../../cloudflared.exe')
      
      if (!fs.existsSync(cloudflaredPath)) {
        reject(new Error('cloudflared.exe not found. Please download it first.'))
        return
      }

      tunnelProcess = spawn(cloudflaredPath, ['tunnel', '--url', 'http://localhost:8000'], {
        detached: false,
        stdio: 'pipe'
      })

      let outputBuffer = ''

      tunnelProcess.stdout.on('data', (data) => {
        outputBuffer += data.toString()
        const match = outputBuffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
        if (match && !tunnelUrl) {
          tunnelUrl = match[0]
          store.set('cloudflare.tunnelUrl', tunnelUrl)
          resolve(tunnelUrl)
        }
      })

      tunnelProcess.stderr.on('data', (data) => {
        console.error('Tunnel error:', data.toString())
      })

      tunnelProcess.on('error', (error) => {
        reject(new Error(`Failed to start tunnel: ${error.message}`))
      })

      tunnelProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.log(`Tunnel process exited with code ${code}`)
        }
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!tunnelUrl) {
          reject(new Error('Tunnel startup timeout'))
        }
      }, 30000)
    })
  } catch (error) {
    throw new Error(`Tunnel start failed: ${error.message}`)
  }
})

// Update Worker's BACKEND_ORIGIN environment variable via central API
ipcMain.handle('update-worker-tunnel', async (event, { trainer_id, tunnel_url }) => {
  try {
    console.log(`Updating tunnel URL for trainer ${trainer_id}...`)
    
    const response = await axios.post(`${CENTRAL_API_URL}/update-tunnel`, {
      trainer_id,
      tunnel_url,
      registration_secret: REGISTRATION_SECRET
    })

    if (!response.data.success) {
      throw new Error('Tunnel update failed')
    }

    // Update stored tunnel URL
    const trainer = store.get('trainer')
    store.set('trainer', {
      ...trainer,
      tunnelUrl: tunnel_url,
      onboarded: true // Mark as complete
    })

    console.log('Tunnel URL updated successfully')

    return { success: true }
  } catch (error) {
    throw new Error(`Tunnel update failed: ${error.response?.data?.details || error.message}`)
  }
})

// Get trainer config (for UI)
ipcMain.handle('get-trainer-config', async () => {
  return store.get('trainer', null)
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  // Kill tunnel process on exit
  if (tunnelProcess) {
    tunnelProcess.kill()
  }
  
  if (process.platform !== 'darwin') app.quit()
})

// Cleanup on app quit
app.on('before-quit', () => {
  if (tunnelProcess) {
    tunnelProcess.kill()
  }
})
