import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { ScrollArea } from './ui/scroll-area'
import { CreateApiKeyDialog } from './CreateApiKeyDialog'
import { EditApiKeyDialog } from './EditApiKeyDialog'
import { VersionDisplay } from './VersionDisplay'

interface ApiKey {
  id: number
  name: string
  value: string
  created_at: string
}

interface ApiKeySelectionProps {
  onApiKeySelected: (apiKey: ApiKey) => void
}

export function ApiKeySelection({ onApiKeySelected }: ApiKeySelectionProps): React.JSX.Element {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadApiKeys = async () => {
    try {
      setIsLoading(true)
      setError('')
      const keys = await window.api.apiKeys.getAll()
      setApiKeys(keys)
    } catch (error) {
      console.error('Failed to load API keys:', error)
      setError('Failed to load API keys. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadApiKeys()
  }, [])

  const handleApiKeyCreated = (newApiKey: ApiKey) => {
    setApiKeys((prev) => [newApiKey, ...prev])
  }

  const handleApiKeyUpdated = (updated: ApiKey): void => {
    setApiKeys((prev) => prev.map((key) => (key.id === updated.id ? updated : key)))
  }

  const handleApiKeyDeleted = (id: number): void => {
    setApiKeys((prev) => prev.filter((key) => key.id !== id))
  }

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-lg">Loading API keys...</div>
          </div>
        </div>
        <VersionDisplay />
      </>
    )
  }

  return (
    <>
      <div className="w-full max-w-sm">
        <Card className="border-0 shadow-sm py-2">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-base">API Keys</CardTitle>
            <CardDescription className="text-xs">
              Select an API key or create a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            {error && (
              <div className="p-2 bg-destructive/10 text-destructive text-xs rounded-md">
                {error}
              </div>
            )}

            {apiKeys.length === 0 ? (
              <div className="text-center py-4 space-y-3">
                <div className="text-muted-foreground text-xs">
                  No API keys found. Create your first one.
                </div>
                <CreateApiKeyDialog onApiKeyCreated={handleApiKeyCreated} />
              </div>
            ) : (
              <>
                <ScrollArea className="pr-2">
                  <div className="space-y-1.5">
                    {apiKeys.map((apiKey) => (
                      <Card
                        key={apiKey.id}
                        className="transition-colors hover:bg-muted/50 cursor-pointer border-0 shadow-none bg-muted/20 py-2"
                        onClick={() => onApiKeySelected(apiKey)}
                      >
                        <CardContent className="flex items-center gap-2">
                          <div className="text-sm font-medium truncate flex-1">{apiKey.name}</div>
                          <EditApiKeyDialog
                            apiKey={apiKey}
                            onApiKeyUpdated={handleApiKeyUpdated}
                            onApiKeyDeleted={handleApiKeyDeleted}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

                <div className="pt-2 border-t">
                  <CreateApiKeyDialog onApiKeyCreated={handleApiKeyCreated} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <VersionDisplay />
    </>
  )
}
