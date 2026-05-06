import { createRequestListener } from '@rayweefa/electron-fetch-server'
import { app, BrowserWindow, protocol } from 'electron'

import { router } from '../app/router.ts'

const APP_PROTOCOL = 'app'
const APP_HOST = 'local'
const APP_URL = `${APP_PROTOCOL}://${APP_HOST}/`

if (!protocol) {
  throw new Error(
    'Electron protocol API is unavailable. Make sure you are running the Electron binary (not ELECTRON_RUN_AS_NODE=1).',
  )
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
])

function createMainWindow() {
  let mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  void mainWindow.loadURL(APP_URL)

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }
}

function createAppRequestListener() {
  return createRequestListener(async (request) => {
    try {
      return await router.fetch(request)
    } catch (error) {
      console.error('Router error:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  })
}

app
  .whenReady()
  .then(async () => {
    await protocol.handle(APP_PROTOCOL, createAppRequestListener())
    createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow()
      }
    })
  })
  .catch((error) => {
    console.error('Failed to start Electron app:', error)
    app.quit()
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
