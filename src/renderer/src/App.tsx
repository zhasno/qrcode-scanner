import { useState, useEffect } from 'react'
import { RotateCw } from 'lucide-react'
import { ApiKeyDialog } from './components/ApiKeyDialog'
import { QRScanScreen } from './components/QRScanScreen'
import { SuccessScreen, ErrorScreen } from './components/ResultScreens'
import { LoadingScreen } from './components/LoadingScreen'
import UpdateNotification from './components/UpdateNotification'
import { Button } from './components/ui/button'
import { ScanResult } from './lib/scan'

// The kiosk screen this app runs on is physically mounted upside down, so the
// whole UI is flipped 180° by default to display right-side up for the
// viewer. The choice is remembered across restarts in case a screen is
// mounted the normal way round.
const ROTATION_STORAGE_KEY = 'qr-scanner-screen-rotated'

type AppState = 'api-key-loading' | 'api-key-missing' | 'qr-scan' | 'loading' | 'success' | 'error'

// How long a result stays on screen before the scanner is ready again.
const SUCCESS_MS = 2000
const ERROR_MS = 4000

interface ApiKey {
  id: number
  name: string
  created_at: string
  last4: string
}

function App(): React.JSX.Element {
  const [currentState, setCurrentState] = useState<AppState>('api-key-loading')
  const [apiKey, setApiKey] = useState<ApiKey | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [isRotated, setIsRotated] = useState<boolean>(() => {
    const stored = localStorage.getItem(ROTATION_STORAGE_KEY)
    return stored === null ? true : stored === 'true'
  })

  const toggleRotation = (): void => {
    setIsRotated((prev) => {
      const next = !prev
      localStorage.setItem(ROTATION_STORAGE_KEY, String(next))
      return next
    })
  }

  // The app holds a single API key. If one is stored there is nothing to choose,
  // so go straight to scanning; otherwise ask for it up front.
  useEffect(() => {
    const loadApiKey = async (): Promise<void> => {
      try {
        const stored = await window.api.apiKeys.get()
        setApiKey(stored)
        setCurrentState(stored ? 'qr-scan' : 'api-key-missing')
      } catch (error) {
        console.error('Failed to load API key:', error)
        setCurrentState('api-key-missing')
      }
    }

    loadApiKey()
  }, [])

  const handleApiKeySaved = (saved: ApiKey): void => {
    setApiKey(saved)
    setCurrentState('qr-scan')
  }

  const handleApiKeyDeleted = (): void => {
    setApiKey(null)
    setCurrentState('api-key-missing')
  }

  const handleRegistrationStarted = () => {
    setCurrentState('loading')
  }

  const handleRegistrationResult = (scan: ScanResult): void => {
    setResult(scan)
    setCurrentState(scan.ok ? 'success' : 'error')
  }

  // Back to the scan screen after the result has been shown
  useEffect(() => {
    if (currentState === 'success' || currentState === 'error') {
      const timer = setTimeout(
        () => {
          setResult(null)
          setCurrentState('qr-scan')
        },
        currentState === 'success' ? SUCCESS_MS : ERROR_MS
      )

      return () => clearTimeout(timer)
    }

    return () => {} // Return empty cleanup function for other states
  }, [currentState])

  return (
    <div
      className={`h-screen w-screen flex items-center justify-center bg-background p-2 overflow-hidden ${
        isRotated ? 'rotate-180' : ''
      }`}
    >
      <UpdateNotification />

      {/* Lets the screen be flipped back if it turns out not to be mounted
          upside down (or is remounted the right way up later). Sits inside
          the rotated wrapper so it always reads correctly for the viewer.
          Bottom-left is the only corner not already used by the update /
          fullscreen buttons (top-left), the settings gear (top-right) and
          the version label (bottom-right). */}
      <Button
        onClick={toggleRotation}
        variant="ghost"
        size="icon"
        className="fixed bottom-2 left-2 z-50 h-9 w-9 text-muted-foreground"
        title="Vend skærmen 180 grader"
        aria-label="Vend skærmen 180 grader"
      >
        <RotateCw className="h-5 w-5" />
      </Button>

      {currentState === 'api-key-loading' && <LoadingScreen />}

      {currentState === 'api-key-missing' && (
        <ApiKeyDialog
          apiKey={null}
          open
          dismissible={false}
          onOpenChange={() => {}}
          onSaved={handleApiKeySaved}
          onDeleted={handleApiKeyDeleted}
        />
      )}

      {currentState === 'qr-scan' && apiKey && (
        <QRScanScreen
          apiKey={apiKey}
          onRegistrationStarted={handleRegistrationStarted}
          onRegistrationResult={handleRegistrationResult}
          onApiKeySaved={handleApiKeySaved}
          onApiKeyDeleted={handleApiKeyDeleted}
        />
      )}

      {currentState === 'loading' && <LoadingScreen />}

      {currentState === 'success' && result?.ok && <SuccessScreen result={result} />}

      {currentState === 'error' && result && !result.ok && (
        <ErrorScreen error={result.error} seconds={ERROR_MS / 1000} />
      )}
    </div>
  )
}

export default App
