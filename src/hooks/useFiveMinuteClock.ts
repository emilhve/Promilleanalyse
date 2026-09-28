import { useEffect, useState } from 'react'

const FIVE_MINUTES_MS = 5 * 60 * 1000

export function useFiveMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let intervalId: number | undefined
    const millisecondsToNextBoundary =
      FIVE_MINUTES_MS - (Date.now() % FIVE_MINUTES_MS)

    const timeoutId = window.setTimeout(() => {
      setNow(new Date())
      intervalId = window.setInterval(() => setNow(new Date()), FIVE_MINUTES_MS)
    }, millisecondsToNextBoundary)

    return () => {
      window.clearTimeout(timeoutId)
      if (intervalId !== undefined) {
        window.clearInterval(intervalId)
      }
    }
  }, [])

  return now
}
