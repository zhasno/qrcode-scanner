import { useState, useEffect } from 'react'
import { ApiKeyDialog } from './components/ApiKeyDialog'
import { QRScanScreen } from './components/QRScanScreen'
import { SuccessScreen, ErrorScreen } from './components/ResultScreens'
import { LoadingScreen } from './components/LoadingScreen'
import UpdateNotification from './components/UpdateNotification'

type AppState = 'api-key-loading' | 'api-key-missing' | 'qr-scan' | 'loading' | 'success' | 'error'

interface ApiKey {
  id: number
  name: string
  value: string
  created_at: string
}

function App(): React.JSX.Element {
  const [currentState, setCurrentState] = useState<AppState>('api-key-loading')
  const [apiKey, setApiKey] = useState<ApiKey | null>(null)
  const [registrationResult, setRegistrationResult] = useState<{
    firstName?: string
    lastName?: string
    error?: string
  }>({})

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

  const handleRegistrationSuccess = (firstName: string, lastName: string) => {
    setRegistrationResult({ firstName, lastName })
    setCurrentState('success')
  }

  const handleRegistrationError = (error: string) => {
    setRegistrationResult({ error })
    console.log(error)
    setCurrentState('error')
  }

  // Auto-redirect from success/error page to scan page after 2 seconds
  useEffect(() => {
    if (currentState === 'success' || currentState === 'error') {
      const timer = setTimeout(() => {
        setRegistrationResult({})
        setCurrentState('qr-scan')
      }, 2000) // 2 seconds

      return () => clearTimeout(timer)
    }

    return () => {} // Return empty cleanup function for other states
  }, [currentState])

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background p-2 overflow-hidden">
      <UpdateNotification />

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
          onRegistrationSuccess={handleRegistrationSuccess}
          onRegistrationError={handleRegistrationError}
          onApiKeySaved={handleApiKeySaved}
          onApiKeyDeleted={handleApiKeyDeleted}
        />
      )}

      {currentState === 'loading' && <LoadingScreen />}

      {currentState === 'success' &&
        registrationResult.firstName &&
        registrationResult.lastName && (
          <SuccessScreen
            firstName={registrationResult.firstName}
            lastName={registrationResult.lastName}
          />
        )}

      {currentState === 'error' && <ErrorScreen />}
    </div>
  )
}

export default App
