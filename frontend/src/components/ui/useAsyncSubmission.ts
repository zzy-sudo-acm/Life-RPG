import { useCallback, useRef, useState } from 'react'

function errorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return `${fallbackMessage}：${error.message}`
  }

  return fallbackMessage
}

export function useAsyncSubmission() {
  const submittingRef = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  const clearSubmissionError = useCallback(() => {
    setSubmissionError(null)
  }, [])

  const runSubmission = useCallback(
    async (action: () => Promise<void>, fallbackMessage: string) => {
      if (submittingRef.current) {
        return false
      }

      submittingRef.current = true
      setIsSubmitting(true)
      setSubmissionError(null)

      try {
        await action()
        return true
      } catch (error) {
        setSubmissionError(errorMessage(error, fallbackMessage))
        return false
      } finally {
        submittingRef.current = false
        setIsSubmitting(false)
      }
    },
    [],
  )

  return {
    isSubmitting,
    submissionError,
    clearSubmissionError,
    runSubmission,
  }
}
