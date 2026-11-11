import { ElectronAPI } from '@electron-toolkit/preload'

interface UpdateInfo {
  version: string
  releaseDate?: string
  releaseName?: string
  releaseNotes?: string
}

interface DownloadProgress {
  bytesPerSecond: number
  percent: number
  transferred: number
  total: number
}

interface UpdateCheckResult {
  updateInfo?: {
    version: string
    files?: Array<{
      url: string
      sha512: string
      size: number
    }>
    path?: string
    sha512?: string
    releaseDate?: string
  }
  versionInfo?: {
    version: string
  }
  error?: string
}

interface UpdaterAPI {
  checkForUpdates: () => Promise<UpdateCheckResult | null>
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>
  quitAndInstall: () => Promise<void>
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void
  onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => void
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void
  onError: (callback: (error: { message: string; name: string }) => void) => void
}

interface ScannerAPI {
  getStatus: () => Promise<boolean>
  reconnect: () => Promise<{ success: boolean; connected: boolean; error?: string }>
  sendCommand: (command: string) => Promise<{ success: boolean; error?: string }>
  onQRScanned: (callback: (data: string) => void) => void
  removeQRListener: () => void
}

interface WindowAPI {
  toggleFullscreen: () => Promise<boolean>
  setFullscreen: (fullscreen: boolean) => Promise<boolean>
  isFullscreen: () => Promise<boolean>
  toggleMaximize: () => Promise<boolean>
  isMaximized: () => Promise<boolean>
}

// The renderer never gets the key itself, only its last four characters.
interface ApiKey {
  id: number
  name: string
  created_at: string
  last4: string
}

interface ApiKeysAPI {
  get: () => Promise<ApiKey | null>
  create: (name: string, value: string) => Promise<ApiKey>
  // An empty value keeps the stored key.
  update: (id: number, name: string, value: string) => Promise<ApiKey>
  delete: (id: number) => Promise<boolean>
}

type ScanErrorCode =
  | 'gammel_kode'
  | 'ugyldig_kode'
  | 'ukendt_elev'
  | 'elev_pause'
  | 'ingen_klasse'
  | 'ingen_undervisning'
  | 'ukendt_apparat'
  | 'ingen_noegle'
  | 'for_mange'
  | 'ingen_forbindelse'
  | 'serverfejl'

type ScanResult =
  | { ok: true; status: 'registreret' | 'allerede'; name: string; time: string; late: boolean }
  | { ok: false; error: ScanErrorCode }

interface AttendanceAPI {
  scan: (data: string) => Promise<ScanResult>
}

interface AppAPI {
  getVersion: () => Promise<string>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      updater: UpdaterAPI
      scanner: ScannerAPI
      window: WindowAPI
      attendance: AttendanceAPI
      apiKeys: ApiKeysAPI
      app: AppAPI
    }
  }
}
