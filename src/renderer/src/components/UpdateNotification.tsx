import { useEffect, useState } from 'react'
import { Maximize, Minimize, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'
import { Progress } from './ui/progress'

interface UpdateInfo {
  version: string
  releaseNotes?: string
  releaseName?: string
}

interface DownloadProgress {
  bytesPerSecond: number
  percent: number
  transferred: number
  total: number
}

const UpdateNotification = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  const [updateReady, setUpdateReady] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (!window.api?.updater) return

    // Check initial fullscreen state
    if (window.api?.window) {
      window.api.window.isFullscreen().then(setIsFullscreen)
    }

    window.api.updater.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateAvailable(true)
      setUpdateInfo(info)
      setError(null)
    })

    window.api.updater.onUpdateNotAvailable(() => {
      setUpdateAvailable(false)
      setUpdateInfo(null)
    })

    window.api.updater.onDownloadProgress((progress: DownloadProgress) => {
      setDownloading(true)
      setDownloadProgress(progress)
    })

    window.api.updater.onUpdateDownloaded((info: UpdateInfo) => {
      setDownloading(false)
      setDownloadProgress(null)
      setUpdateReady(true)
      setUpdateInfo(info)
    })

    window.api.updater.onError((err: any) => {
      setError(err.message || 'Update error occurred')
      setDownloading(false)
      setDownloadProgress(null)
    })
  }, [])

  const handleDownloadUpdate = async () => {
    try {
      setDownloading(true)
      setError(null)
      await window.api.updater.downloadUpdate()
    } catch (err) {
      setDownloading(false)
      setError('Failed to download update')
    }
  }

  const handleInstallUpdate = async () => {
    try {
      setInstalling(true)
      setError(null)
      await window.api.updater.quitAndInstall()
    } catch (err) {
      setInstalling(false)
      setError('Failed to install update')
    }
  }

  const handleCheckForUpdates = async () => {
    try {
      await window.api.updater.checkForUpdates()
    } catch (err) {
      setError('Failed to check for updates')
    }
  }

  const handleToggleFullscreen = async () => {
    try {
      const fullscreen = await window.api.window.toggleFullscreen()
      setIsFullscreen(fullscreen)
    } catch (err) {
      console.error('Failed to toggle fullscreen:', err)
    }
  }

  if (error) {
    return (
      <Alert variant="destructive" className="fixed top-1 left-1 right-1 z-50 p-2 text-[8px]">
        <AlertTitle className="text-[9px] mb-1">⚠️ Update Error</AlertTitle>
        <AlertDescription className="text-[8px]">{error}</AlertDescription>
        <Button
          onClick={() => setError(null)}
          variant="outline"
          size="sm"
          className="mt-2 h-5 px-2 text-[7px]"
        >
          Dismiss
        </Button>
      </Alert>
    )
  }

  if (installing) {
    return (
      <Alert className="fixed top-1 left-1 right-1 z-50 p-2 text-center border-yellow-500 bg-yellow-50 text-yellow-800">
        <AlertTitle className="text-[9px] mb-1">⚙️ Installing Update...</AlertTitle>
        <div className="flex justify-center my-2">
          <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <AlertDescription className="text-[7px]">
          Installing update and restarting application...
        </AlertDescription>
      </Alert>
    )
  }

  if (updateReady) {
    return (
      <Alert className="fixed top-1 left-1 right-1 z-50 p-2 border-green-500 bg-green-50 text-green-800">
        <AlertTitle className="text-[9px] mb-1">🎉 Update Ready!</AlertTitle>
        <AlertDescription className="text-[8px] mb-2">
          Version {updateInfo?.version} has been downloaded and is ready to install.
        </AlertDescription>
        <div className="flex gap-1">
          <Button
            onClick={handleInstallUpdate}
            size="sm"
            className="h-5 px-2 text-[7px] bg-green-600 hover:bg-green-700"
          >
            Install Now
          </Button>
          <Button
            onClick={() => setUpdateReady(false)}
            variant="outline"
            size="sm"
            className="h-5 px-2 text-[7px]"
          >
            Later
          </Button>
        </div>
      </Alert>
    )
  }

  if (downloading && downloadProgress) {
    return (
      <Alert className="fixed top-1 left-1 right-1 z-50 p-2 text-center border-blue-500 bg-blue-50 text-blue-800">
        <AlertTitle className="text-[9px] mb-1">⬇️ Downloading Update...</AlertTitle>
        <Progress value={downloadProgress.percent} className="h-1 my-2" />
        <AlertDescription className="text-[7px]">
          {Math.round(downloadProgress.percent)}% -{' '}
          {(downloadProgress.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s
        </AlertDescription>
      </Alert>
    )
  }

  if (downloading && !downloadProgress) {
    return (
      <Alert className="fixed top-1 left-1 right-1 z-50 p-2 text-center border-blue-500 bg-blue-50 text-blue-800">
        <AlertTitle className="text-[9px] mb-1">⬇️ Preparing Download...</AlertTitle>
        <div className="flex justify-center my-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Alert>
    )
  }

  if (updateAvailable) {
    return (
      <Alert className="fixed top-1 left-1 right-1 z-50 p-2 border-blue-500 bg-blue-50 text-blue-800">
        <AlertTitle className="text-[9px] mb-1">🚀 Update Available!</AlertTitle>
        <AlertDescription className="text-[8px] mb-2">
          Version {updateInfo?.version} is now available.
        </AlertDescription>
        <div className="flex gap-1">
          <Button
            onClick={handleDownloadUpdate}
            size="sm"
            className="h-5 px-2 text-[7px] bg-blue-600 hover:bg-blue-700"
          >
            Download
          </Button>
          <Button
            onClick={() => setUpdateAvailable(false)}
            variant="outline"
            size="sm"
            className="h-5 px-2 text-[7px]"
          >
            Later
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    // Sized to match the settings icon on the scan screen.
    <div className="fixed top-2 left-2 z-50 flex gap-1">
      <Button
        onClick={handleCheckForUpdates}
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-muted-foreground"
        title="Check for updates"
        aria-label="Check for updates"
      >
        <RefreshCw className="h-5 w-5" />
      </Button>
      <Button
        onClick={handleToggleFullscreen}
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-muted-foreground"
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
      </Button>
    </div>
  )
}

export default UpdateNotification
