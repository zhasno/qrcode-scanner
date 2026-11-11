import { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { ApiKeyDialog } from './ApiKeyDialog'
import { VersionDisplay } from './VersionDisplay'
import scanGuideVideo from '../assets/scan-guide.mp4'
import { ScanResult } from '../lib/scan'

interface ApiKey {
  id: number
  name: string
  created_at: string
  last4: string
}

interface QRScanScreenProps {
  apiKey: ApiKey
  onRegistrationStarted: () => void
  onRegistrationResult: (result: ScanResult) => void
  onApiKeySaved: (apiKey: ApiKey) => void
  onApiKeyDeleted: () => void
}

export function QRScanScreen({
  apiKey,
  onRegistrationStarted,
  onRegistrationResult,
  onApiKeySaved,
  onApiKeyDeleted
}: QRScanScreenProps): React.JSX.Element {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // The main process checks the code, adds the device key and sends it to the
  // fixed icel.dk address. Nothing scanned is used as an address.
  const handleQRScanned = async (qrData: string): Promise<void> => {
    onRegistrationStarted()
    try {
      onRegistrationResult(await window.api.attendance.scan(qrData))
    } catch (error) {
      console.error('Scan could not be sent:', error instanceof Error ? error.message : error)
      onRegistrationResult({ ok: false, error: 'serverfejl' })
    }
  }

  useEffect(() => {
    console.log('[QRScanScreen] useEffect triggered - setting up QR scanner listener')
    console.log('[QRScanScreen] window.api exists:', !!window.api)
    console.log('[QRScanScreen] window.api.scanner exists:', !!window.api?.scanner)

    // Set up QR scanner listener
    if (window.api?.scanner) {
      console.log('[QRScanScreen] Registering onQRScanned callback...')
      window.api.scanner.onQRScanned(handleQRScanned)
      console.log('[QRScanScreen] ✅ onQRScanned callback registered successfully')
    } else {
      console.error('[QRScanScreen] ❌ window.api.scanner not available!')
    }

    // Cleanup function to remove listener when component unmounts
    return () => {
      console.log('[QRScanScreen] Cleanup - removing QR listener...')
      if (window.api?.scanner) {
        window.api.scanner.removeQRListener()
        console.log('[QRScanScreen] ✅ QR listener removed')
      }
    }
  }, [apiKey])

  return (
    <>
      {/* Fixed so the video covers the whole window, escaping the padding the
          app shell puts around the centred screens. */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        {/* Silent clip showing how to hold the phone up to the scanner. */}
        <video
          src={scanGuideVideo}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Keeps the arrow legible wherever the footage happens to be light. */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-background to-transparent" />

        {/* Settings */}
        <div className="absolute top-1 right-1 z-10">
          <Button
            onClick={() => setIsSettingsOpen(true)}
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground"
            title="Indstillinger"
            aria-label="Indstillinger"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Scan Indicator */}
        <div className="absolute inset-x-0 bottom-8 z-10 flex items-center justify-center">
          <svg
            className="w-20 h-20 text-[#8ee9b4]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        {/* Development Test Buttons */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="absolute top-1 left-1/2 -translate-x-1/2 z-10 border-0 shadow-sm bg-yellow-50 dark:bg-yellow-950 w-full max-w-sm">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-base text-yellow-800 dark:text-yellow-200">
                Development Tools
              </CardTitle>
              <CardDescription className="text-xs text-yellow-600 dark:text-yellow-400">
                Test buttons for development only
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4">
              <Button
                onClick={() =>
                  onRegistrationResult({
                    ok: true,
                    status: 'registreret',
                    name: 'Jamal Hajar',
                    time: '12.31',
                    late: false
                  })
                }
                className="w-full h-8 text-sm bg-green-600 hover:bg-green-700"
              >
                Test Success Scan
              </Button>
              <Button
                onClick={() => onRegistrationResult({ ok: false, error: 'ingen_forbindelse' })}
                variant="destructive"
                className="w-full h-8 text-sm"
              >
                Test Fail Scan
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ApiKeyDialog
        apiKey={apiKey}
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onSaved={onApiKeySaved}
        onDeleted={onApiKeyDeleted}
      />

      <VersionDisplay />
    </>
  )
}
