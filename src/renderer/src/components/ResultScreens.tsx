import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { VersionDisplay } from './VersionDisplay'
import { CheckCircle, XCircle } from 'lucide-react'

interface SuccessScreenProps {
  firstName: string
  lastName: string
}

export function SuccessScreen({ firstName, lastName }: SuccessScreenProps): React.JSX.Element {
  const [countdown, setCountdown] = useState(2)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)

      return () => clearTimeout(timer)
    }

    return () => {} // Return empty cleanup function when countdown is 0
  }, [countdown])

  return (
    <>
      <div className="w-full max-w-sm">
        <div className="text-center py-8">
          <div className="space-y-6">
            <CheckCircle className="h-24 w-24 text-green-500 dark:text-green-400 mx-auto" />
            <div className="space-y-2">
              <p className="text-xl font-medium text-green-700 dark:text-green-400">Success!</p>
              <p className="text-3xl font-bold text-foreground">
                {firstName} {lastName}
              </p>
            </div>
          </div>
        </div>
      </div>
      <VersionDisplay />
    </>
  )
}

export function ErrorScreen(): React.JSX.Element {
  const [countdown, setCountdown] = useState(2)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)

      return () => clearTimeout(timer)
    }

    return () => {} // Return empty cleanup function when countdown is 0
  }, [countdown])

  return (
    <>
      <div className="w-full max-w-sm">
        <Card className="text-center border-0 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex justify-center mb-2">
              <XCircle className="h-12 w-12 text-red-500 dark:text-red-400" />
            </div>
            <CardTitle className="text-base text-red-700 dark:text-red-400">Registration Failed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div className="space-y-2">
              <p className="text-red-600 dark:text-red-400 text-sm">
                Something went wrong while registering. Please try again.
              </p>
            </div>

            {/* Countdown Timer */}
            <div className="flex items-center justify-center space-x-2 pt-2">
              <div className="w-6 h-6 rounded-full border-2 border-red-500 dark:border-red-400 flex items-center justify-center">
                <span className="text-xs font-bold text-red-600 dark:text-red-400">{countdown}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {countdown > 0 ? 'Returning to scanner...' : 'Redirecting...'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      <VersionDisplay />
    </>
  )
}
