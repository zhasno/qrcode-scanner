import { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { ApiKeyDialog } from './ApiKeyDialog'
import { VersionDisplay } from './VersionDisplay'
import scanGuideVideo from '../assets/scan-guide.mp4'

interface ApiKey {
  id: number
  name: string
  value: string
  created_at: string
}

interface QRScanScreenProps {
  apiKey: ApiKey
  onRegistrationStarted: () => void
  onRegistrationSuccess: (firstName: string, lastName: string) => void
  onRegistrationError: (error: string) => void
  onApiKeySaved: (apiKey: ApiKey) => void
  onApiKeyDeleted: () => void
}

export function QRScanScreen({
  apiKey,
  onRegistrationStarted,
  onRegistrationSuccess,
  onRegistrationError,
  onApiKeySaved,
  onApiKeyDeleted
}: QRScanScreenProps): React.JSX.Element {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const handleQRScanned = async (qrData: string) => {
    console.log('🚨🚨🚨 QR Code scanned in handleQRScanned:', qrData)
    console.log('🚨🚨🚨 QR Data type:', typeof qrData, 'Length:', qrData.length)

    // Validate that the QR data is an HTTPS URL
    try {
      console.log('🔍 Attempting to parse URL:', qrData.trim())
      const url = new URL(qrData.trim())
      console.log('✅ URL parsed successfully. Protocol:', url.protocol)

      if (!url.protocol.startsWith('https:')) {
        console.error('❌ FAILURE POINT 1: Protocol is not HTTPS. Protocol:', url.protocol)
        onRegistrationError('Only HTTPS URLs are allowed - Protocol: ' + url.protocol)
        return
      }
      console.log('✅ URL validation passed')
    } catch (urlError) {
      console.error('❌ FAILURE POINT 2: Invalid URL format. Error:', urlError)
      console.error('❌ QR Data that failed to parse:', JSON.stringify(qrData))
      onRegistrationError('Invalid QR code URL format - Data: ' + qrData)
      return
    }

    onRegistrationStarted()

    try {
      console.log('Making HTTP request to:', qrData.trim())
      console.log('Using API key:', apiKey.name, '(ending with ...)', apiKey.value.slice(-4))
      console.log('Request headers:', {
        Authorization: `Bearer ${apiKey.value.substring(0, 10)}...`,
        'Content-Type': 'application/json'
      })

      const response = await fetch(qrData.trim(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.value}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('HTTP Response status:', response.status, response.statusText)
      console.log('HTTP Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        console.error('❌ FAILURE POINT 3: HTTP request failed with status:', response.status)
        console.error('Response status text:', response.statusText)
        console.error('Response URL:', response.url)

        // Try to get response body for more details
        try {
          const errorText = await response.text()
          console.error('Response body:', errorText)
          throw new Error(
            `❌ FAILURE POINT 3: HTTP ${response.status}: ${response.statusText}${errorText ? ' - ' + errorText : ''}`
          )
        } catch (textError) {
          console.error('Could not read response body:', textError)
          throw new Error(`❌ FAILURE POINT 3: HTTP ${response.status}: ${response.statusText}`)
        }
      }

      const data = await response.json()
      console.log('Received response data:', JSON.stringify(data, null, 2))

      // Extract firstName and lastName from the root object
      if (!data.firstName || !data.lastName) {
        console.error('❌ FAILURE POINT 4: Invalid response structure:', {
          hasFirstName: !!data.firstName,
          hasLastName: !!data.lastName,
          actualData: data
        })
        throw new Error(
          '❌ FAILURE POINT 4: Response missing required fields: firstName and lastName'
        )
      }

      console.log('Successfully extracted participant data:', {
        firstName: data.firstName,
        lastName: data.lastName
      })
      onRegistrationSuccess(data.firstName, data.lastName)
    } catch (error) {
      console.error('=== REGISTRATION ERROR DETAILS ===')
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error)
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
      console.error('QR Code data that caused error:', qrData)
      console.error('API Key used:', apiKey.name)
      console.error('Full error object:', error)

      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Network error - possible causes:')
        console.error('- No internet connection')
        console.error('- Invalid URL format')
        console.error('- CORS issues')
        console.error('- Server unreachable')
      }

      if (error instanceof Error && error.message.includes('JSON')) {
        console.error('JSON parsing error - response may not be valid JSON')
      }

      console.error('=== END ERROR DETAILS ===')

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      onRegistrationError(errorMessage)
    }
  }

  useEffect(() => {
    console.log('[QRScanScreen] useEffect triggered - setting up QR scanner listener')
    console.log('[QRScanScreen] window.api exists:', !!window.api)
    console.log('[QRScanScreen] window.api.scanner exists:', !!window.api?.scanner)
    console.log('[QRScanScreen] apiKey:', apiKey.name)

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

        {/* Keeps the text legible wherever the footage happens to be light. */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-background to-transparent" />

        {/* Settings */}
        <div className="absolute top-1 right-1 z-10">
          <Button
            onClick={() => setIsSettingsOpen(true)}
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground"
            title="API key settings"
            aria-label="API key settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Scan Indicator */}
        <div className="absolute inset-x-0 bottom-8 z-10 flex flex-col items-center gap-2">
          <p className="text-2xl font-medium text-[#8ee9b4]">Scan here</p>
          <svg
            className="w-16 h-16 text-[#8ee9b4]"
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
              <CardTitle className="text-base text-yellow-800 dark:text-yellow-200">Development Tools</CardTitle>
              <CardDescription className="text-xs text-yellow-600 dark:text-yellow-400">
                Test buttons for development only
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4">
              <Button
                onClick={() => onRegistrationSuccess('John', 'Doe')}
                className="w-full h-8 text-sm bg-green-600 hover:bg-green-700"
              >
                Test Success Scan
              </Button>
              <Button
                onClick={() => onRegistrationError('Test error: Network connection failed')}
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
