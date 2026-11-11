import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './ui/dialog'

interface ApiKey {
  id: number
  name: string
  created_at: string
  last4: string
}

interface ApiKeyDialogProps {
  /** The stored key, or null when none exists yet (create mode). */
  apiKey: ApiKey | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (apiKey: ApiKey) => void
  onDeleted: () => void
  /** False while the app has no key: the dialog then cannot be dismissed. */
  dismissible?: boolean
}

export function ApiKeyDialog({
  apiKey,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
  dismissible = true
}: ApiKeyDialogProps): React.JSX.Element {
  const [name, setName] = useState(apiKey?.name ?? '')
  // The stored key is never sent to this screen; the field is only for a new key.
  const [value, setValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [error, setError] = useState('')

  // Reset the form whenever the dialog opens so a cancelled edit is discarded.
  useEffect(() => {
    if (open) {
      setName(apiKey?.name ?? '')
      setValue('')
      setIsConfirmingDelete(false)
      setError('')
    }
  }, [open, apiKey])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    if (!name.trim() || (!apiKey && !value.trim())) {
      setError('Udfyld både navn og nøgle.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const saved = apiKey
        ? await window.api.apiKeys.update(apiKey.id, name.trim(), value.trim())
        : await window.api.apiKeys.create(name.trim(), value.trim())

      onSaved(saved)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save API key:', error instanceof Error ? error.message : error)
      setError(
        error instanceof Error && error.message.includes('invalid-key')
          ? 'Nøglen skal være 64 tegn (0-9 og a-f). Kopiér den fra icel.dk → Alharari Skole → Indstillinger.'
          : 'Nøglen kunne ikke gemmes. Prøv igen.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!apiKey) return

    setIsLoading(true)
    setError('')

    try {
      await window.api.apiKeys.delete(apiKey.id)
      onDeleted()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to delete API key:', error)
      setError('Nøglen kunne ikke slettes. Prøv igen.')
      setIsConfirmingDelete(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (next: boolean): void => {
    if (isLoading) return
    if (!next && !dismissible) return

    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[320px] w-[90vw]"
        showCloseButton={dismissible}
        onEscapeKeyDown={(e) => !dismissible && e.preventDefault()}
        onPointerDownOutside={(e) => !dismissible && e.preventDefault()}
        onInteractOutside={(e) => !dismissible && e.preventDefault()}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-base">
              {apiKey ? 'Apparatets nøgle' : 'Indtast apparatets nøgle'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {apiKey
                ? `Den gemte nøgle slutter på …${apiKey.last4}. Indsæt kun en ny nøgle, hvis den skal skiftes.`
                : 'Apparatet skal have en nøgle, før det kan registrere fremmøde. Den laves på icel.dk under Alharari Skole → Indstillinger.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="grid gap-1">
              <Label htmlFor="api-key-name" className="text-xs">
                Navn
              </Label>
              <Input
                id="api-key-name"
                placeholder="Fx Skolens scanner"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="h-8 text-sm"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="api-key-value" className="text-xs">
                {apiKey ? 'Ny nøgle (valgfri)' : 'Nøgle'}
              </Label>
              <Input
                id="api-key-value"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={
                  apiKey ? 'Lad stå tom for at beholde den gemte' : '64 tegn fra icel.dk'
                }
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={isLoading}
                className="h-8 text-sm"
              />
            </div>
            {error && <div className="text-xs text-destructive">{error}</div>}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {isConfirmingDelete ? (
              <div className="flex w-full items-center gap-2">
                <span className="text-xs text-muted-foreground flex-1">Slet nøglen?</span>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isLoading}
                  onClick={() => setIsConfirmingDelete(false)}
                  className="h-8 text-sm"
                >
                  Fortryd
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isLoading}
                  onClick={handleDelete}
                  className="h-8 text-sm"
                >
                  {isLoading ? 'Sletter …' : 'Slet'}
                </Button>
              </div>
            ) : (
              <>
                {apiKey && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isLoading}
                    onClick={() => setIsConfirmingDelete(true)}
                    className="h-8 text-sm text-destructive hover:text-destructive"
                  >
                    Slet
                  </Button>
                )}
                <Button type="submit" disabled={isLoading} className="h-8 text-sm">
                  {isLoading ? 'Gemmer …' : 'Gem'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
