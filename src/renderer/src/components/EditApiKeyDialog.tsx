import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './ui/dialog'

interface ApiKey {
  id: number
  name: string
  value: string
  created_at: string
}

interface EditApiKeyDialogProps {
  apiKey: ApiKey
  onApiKeyUpdated: (apiKey: ApiKey) => void
  onApiKeyDeleted: (id: number) => void
}

export function EditApiKeyDialog({
  apiKey,
  onApiKeyUpdated,
  onApiKeyDeleted
}: EditApiKeyDialogProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState(apiKey.name)
  const [value, setValue] = useState(apiKey.value)
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    if (!name.trim() || !value.trim()) {
      setError('Please fill in both fields')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const updated = await window.api.apiKeys.update(apiKey.id, name.trim(), value.trim())
      onApiKeyUpdated(updated)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to update API key:', error)
      setError('Failed to update API key. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (): Promise<void> => {
    setIsLoading(true)
    setError('')

    try {
      await window.api.apiKeys.delete(apiKey.id)
      onApiKeyDeleted(apiKey.id)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to delete API key:', error)
      setError('Failed to delete API key. Please try again.')
      setIsConfirmingDelete(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean): void => {
    if (isLoading) return

    setIsOpen(open)
    if (!open) {
      // Reset to the stored values so a cancelled edit is not carried over.
      setName(apiKey.name)
      setValue(apiKey.value)
      setIsConfirmingDelete(false)
      setError('')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label={`Edit ${apiKey.name}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[320px] w-[90vw]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-base">Edit API Key</DialogTitle>
            <DialogDescription className="text-xs">
              Change the name or value, or delete this key.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="grid gap-1">
              <Label htmlFor={`edit-name-${apiKey.id}`} className="text-xs">
                Name
              </Label>
              <Input
                id={`edit-name-${apiKey.id}`}
                placeholder="e.g., Production Key"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="h-8 text-sm"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`edit-value-${apiKey.id}`} className="text-xs">
                API Key
              </Label>
              <Input
                id={`edit-value-${apiKey.id}`}
                type="text"
                placeholder="Your API key value"
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
                <span className="text-xs text-muted-foreground flex-1">Delete this key?</span>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isLoading}
                  onClick={() => setIsConfirmingDelete(false)}
                  className="h-8 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isLoading}
                  onClick={handleDelete}
                  className="h-8 text-sm"
                >
                  {isLoading ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isLoading}
                  onClick={() => setIsConfirmingDelete(true)}
                  className="h-8 text-sm text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
                <Button type="submit" disabled={isLoading} className="h-8 text-sm">
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
