import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { GM60Scanner } from './gm60-scanner'
import { DatabaseService, ApiKey } from './database'
import { registerAttendance, isValidDeviceKey } from './attendance'
import icon from '../../resources/icon.png?asset'

// Configure auto-updater
autoUpdater.checkForUpdatesAndNotify()

let mainWindow: BrowserWindow
let qrScanner: GM60Scanner
let dbService: DatabaseService

interface PublicApiKey {
  id: number
  name: string
  created_at: string
  last4: string
}

// Auto-updater events
// mainWindow keeps pointing at the BrowserWindow after it is destroyed, so a
// truthiness check is not enough: quitAndInstall tears the window down before
// the updater reports the outcome, and touching webContents then throws
// "Object has been destroyed" and crashes the main process.
function sendToRenderer(channel: string, payload?: unknown): void {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) {
    return
  }

  mainWindow.webContents.send(channel, payload)
}

autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...')
})

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info)
  sendToRenderer('update-available', {
    version: info.version,
    releaseDate: info.releaseDate,
    releaseName: info.releaseName,
    releaseNotes: info.releaseNotes
  })
})

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info)
  sendToRenderer('update-not-available', {
    version: info.version,
    releaseDate: info.releaseDate
  })
})

autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater:', err)
  sendToRenderer('updater-error', {
    message: err instanceof Error ? err.message : 'Unknown error',
    name: err instanceof Error ? err.name : 'Error'
  })
})

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = `Download speed: ${progressObj.bytesPerSecond}`
  log_message = log_message + ` - Downloaded ${progressObj.percent}%`
  log_message = log_message + ` (${progressObj.transferred}/${progressObj.total})`
  console.log(log_message)
  sendToRenderer('download-progress', {
    bytesPerSecond: progressObj.bytesPerSecond,
    percent: progressObj.percent,
    transferred: progressObj.transferred,
    total: progressObj.total
  })
})

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info)
  sendToRenderer('update-downloaded', {
    version: info.version,
    releaseDate: info.releaseDate,
    releaseName: info.releaseName,
    releaseNotes: info.releaseNotes
  })
})

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    fullscreen: true,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()

    // Some Linux window managers ignore the constructor's fullscreen option on a
    // window created with show: false, so reassert it once the window is mapped.
    if (process.platform === 'linux' && !mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(true)
    }

    // Open DevTools in development mode to see renderer logs
    if (is.dev) {
      mainWindow.webContents.openDevTools()
      console.log('[Main] 🔧 DevTools opened for debugging renderer logs')
    }

    // Initialize QR Scanner after window is ready
    console.log('[Main] Window ready - Initializing GM60 QR Scanner...')
    qrScanner = new GM60Scanner()

    console.log('[Main] 🎯 About to register onScan callback...')
    qrScanner.onScan((data) => {
      console.log('[Main] 🚨🚨🚨 MAIN PROCESS CALLBACK TRIGGERED!')
      console.log('[Main] 📡 QR data received from scanner:', data)
      console.log('[Main] 📡 Data type:', typeof data, 'Length:', data.length)
      // Send scanned data to renderer
      sendToRenderer('qr-scanned', data)
    })
    console.log('[Main] ✅ QR Scanner initialization completed')
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Force enable DevTools keyboard shortcuts
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    // Enable Ctrl+Shift+I or F12 to open DevTools
    if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
      mainWindow.webContents.toggleDevTools()
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Auto-updater IPC handlers
  ipcMain.handle('check-for-updates', async () => {
    if (!is.dev) {
      try {
        const result = await autoUpdater.checkForUpdates()
        // Extract only serializable data to avoid cloning errors
        return {
          updateInfo: result
            ? {
                version: result.updateInfo?.version,
                files: result.updateInfo?.files?.map((file) => ({
                  url: file.url,
                  sha512: file.sha512,
                  size: file.size
                })),
                path: result.updateInfo?.path,
                sha512: result.updateInfo?.sha512,
                releaseDate: result.updateInfo?.releaseDate
              }
            : null,
          cancellationToken: null, // Don't send the cancellation token
          versionInfo: result
            ? {
                version: result.updateInfo?.version
              }
            : null
        }
      } catch (error) {
        console.error('Error checking for updates:', error)
        return { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
    return null
  })

  ipcMain.handle('download-update', async () => {
    if (!is.dev) {
      try {
        await autoUpdater.downloadUpdate()
        // Return a simple success indicator instead of complex objects
        return { success: true }
      } catch (error) {
        console.error('Error downloading update:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
    return { success: false, error: 'Development mode' }
  })

  ipcMain.handle('quit-and-install', () => {
    if (!is.dev) {
      autoUpdater.quitAndInstall()
    }
  })

  // QR Scanner IPC handlers
  ipcMain.handle('scanner-status', () => {
    console.log('[Main IPC] scanner-status requested')
    const status = qrScanner ? qrScanner.isConnected() : false
    console.log('[Main IPC] scanner-status response:', status)
    return status
  })

  ipcMain.handle('scanner-reconnect', async () => {
    console.log('[Main IPC] scanner-reconnect requested')
    if (qrScanner) {
      try {
        console.log('[Main IPC] Attempting to reconnect scanner...')
        const success = await qrScanner.reconnect()
        const connected = qrScanner.isConnected()
        console.log('[Main IPC] Reconnect result - success:', success, 'connected:', connected)
        return { success, connected }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Main IPC] scanner-reconnect error:', errorMessage)
        return { success: false, connected: false, error: errorMessage }
      }
    }
    console.warn('[Main IPC] scanner-reconnect failed - scanner not initialized')
    return { success: false, connected: false, error: 'Scanner not initialized' }
  })

  ipcMain.handle('scanner-send-command', async (_, command: string) => {
    if (qrScanner) {
      try {
        await qrScanner.sendCommand(command)
        return { success: true }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return { success: false, error: errorMessage }
      }
    }
    return { success: false, error: 'Scanner not initialized' }
  })

  // Fullscreen IPC handlers
  ipcMain.handle('toggle-fullscreen', () => {
    if (mainWindow) {
      const isFullscreen = mainWindow.isFullScreen()
      mainWindow.setFullScreen(!isFullscreen)
      return !isFullscreen
    }
    return false
  })

  ipcMain.handle('set-fullscreen', (_, fullscreen: boolean) => {
    if (mainWindow) {
      mainWindow.setFullScreen(fullscreen)
      return fullscreen
    }
    return false
  })

  ipcMain.handle('is-fullscreen', () => {
    return mainWindow ? mainWindow.isFullScreen() : false
  })

  // Window maximize/minimize IPC handlers
  ipcMain.handle('toggle-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
        return false
      } else {
        mainWindow.maximize()
        return true
      }
    }
    return false
  })

  ipcMain.handle('is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false
  })

  // Database IPC handlers for the device key.
  // The renderer only ever gets the last four characters, never the key itself.
  const publicKey = (key: ApiKey | undefined): PublicApiKey | null =>
    key
      ? { id: key.id, name: key.name, created_at: key.created_at, last4: key.value.slice(-4) }
      : null

  ipcMain.handle('apiKeys:get', async () => {
    try {
      return publicKey(dbService.getApiKey())
    } catch (error) {
      console.error('Error fetching API key:', error)
      return null
    }
  })

  ipcMain.handle('apiKeys:create', async (_, name: string, value: string) => {
    const key = String(value ?? '')
      .trim()
      .toLowerCase()
    if (!isValidDeviceKey(key)) {
      throw new Error('invalid-key')
    }
    try {
      return publicKey(dbService.createApiKey(name, key))
    } catch (error) {
      console.error('Error creating API key:', error)
      throw error
    }
  })

  // An empty value keeps the stored key and only renames it.
  ipcMain.handle('apiKeys:update', async (_, id: number, name: string, value: string) => {
    const current = dbService.getApiKeyById(id)
    if (!current) {
      throw new Error(`API key ${id} not found`)
    }
    const typed = String(value ?? '')
      .trim()
      .toLowerCase()
    if (typed !== '' && !isValidDeviceKey(typed)) {
      throw new Error('invalid-key')
    }
    try {
      return publicKey(dbService.updateApiKey(id, name, typed === '' ? current.value : typed))
    } catch (error) {
      console.error('Error updating API key:', error)
      throw error
    }
  })

  // Attendance: the scanned text goes to icel.dk together with the stored key.
  ipcMain.handle('attendance:scan', async (_, data: string) => {
    return registerAttendance(data, dbService.getApiKey()?.value ?? null)
  })

  ipcMain.handle('apiKeys:delete', async (_, id: number) => {
    try {
      return dbService.deleteApiKey(id)
    } catch (error) {
      console.error('Error deleting API key:', error)
      throw error
    }
  })

  ipcMain.handle('app:getVersion', () => {
    return app.getVersion()
  })

  // Initialize database service
  dbService = DatabaseService.getInstance()

  createWindow()

  // Check for updates after app is ready (only in production)
  if (!is.dev) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify()
    }, 2000) // Wait 2 seconds after app start
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  // Cleanup QR scanner
  if (qrScanner) {
    await qrScanner.disconnect()
  }

  // Cleanup database
  if (dbService) {
    dbService.close()
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
