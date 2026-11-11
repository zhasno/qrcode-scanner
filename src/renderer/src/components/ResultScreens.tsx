import { useState, useEffect } from 'react'
import { VersionDisplay } from './VersionDisplay'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { ERROR_TEXTS, ScanErrorCode, ScanSuccess } from '../lib/scan'

function Countdown({ seconds }: { seconds: number }): React.JSX.Element {
  const [left, setLeft] = useState(seconds)

  useEffect(() => {
    if (left <= 0) return () => {}
    const timer = setTimeout(() => setLeft(left - 1), 1000)
    return () => clearTimeout(timer)
  }, [left])

  return <p className="text-xs text-muted-foreground pt-4">Klar til næste scanning om {left} …</p>
}

export function SuccessScreen({ result }: { result: ScanSuccess }): React.JSX.Element {
  const already = result.status === 'allerede'

  return (
    <>
      <div className="w-full max-w-md text-center py-8 space-y-6">
        {already ? (
          <Clock className="h-24 w-24 text-sky-500 dark:text-sky-400 mx-auto" />
        ) : (
          <CheckCircle className="h-24 w-24 text-green-500 dark:text-green-400 mx-auto" />
        )}
        <div className="space-y-2">
          <p
            className={`text-xl font-medium ${
              already ? 'text-sky-700 dark:text-sky-400' : 'text-green-700 dark:text-green-400'
            }`}
          >
            {already ? 'Du er allerede registreret' : 'Fremmøde registreret'}
          </p>
          <p className="text-3xl font-bold text-foreground">{result.name}</p>
          {result.time && (
            <p className="text-lg text-muted-foreground">
              kl. {result.time}
              {result.late && (
                <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">
                  · for sent
                </span>
              )}
            </p>
          )}
        </div>
      </div>
      <VersionDisplay />
    </>
  )
}

export function ErrorScreen({
  error,
  seconds
}: {
  error: ScanErrorCode
  seconds: number
}): React.JSX.Element {
  const text = ERROR_TEXTS[error] ?? ERROR_TEXTS.serverfejl

  return (
    <>
      <div className="w-full max-w-md text-center py-8 space-y-6">
        <XCircle className="h-24 w-24 text-red-500 dark:text-red-400 mx-auto" />
        <div className="space-y-2">
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{text.title}</p>
          <p className="text-lg text-foreground">{text.hint}</p>
        </div>
        <Countdown seconds={seconds} />
      </div>
      <VersionDisplay />
    </>
  )
}
