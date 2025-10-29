"use client"

import React, { useEffect, useState, useRef } from 'react'
import { useSaving } from './SavingContext'
import { Check } from 'lucide-react'

export const GlobalSavingIndicator: React.FC = () => {
  const { pendingCount } = useSaving()
  const [showIndicator, setShowIndicator] = useState(false)
  const [savedState, setSavedState] = useState(false)
  const delayedShowTimer = useRef<NodeJS.Timeout | null>(null)
  const savedTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Delay showing the indicator for 250ms to avoid flashing on fast saves
    if (pendingCount > 0 && !showIndicator) {
      delayedShowTimer.current = setTimeout(() => {
        setShowIndicator(true)
        setSavedState(false)
      }, 250)
    } else if (pendingCount === 0 && showIndicator) {
      // If save completes before delay, don't show at all
      if (delayedShowTimer.current) {
        clearTimeout(delayedShowTimer.current)
        delayedShowTimer.current = null
        setShowIndicator(false)
        return
      }

      // Show "Saved" state briefly
      setSavedState(true)
      savedTimer.current = setTimeout(() => {
        setShowIndicator(false)
        setSavedState(false)
      }, 900)
    }

    return () => {
      if (delayedShowTimer.current) {
        clearTimeout(delayedShowTimer.current)
      }
      if (savedTimer.current) {
        clearTimeout(savedTimer.current)
      }
    }
  }, [pendingCount, showIndicator])

  if (!showIndicator) {
    return null
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200 transition-all duration-300"
      role="status"
      aria-live="polite"
      aria-label={savedState ? "Saved successfully" : "Saving changes"}
    >
      {savedState ? (
        <>
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-600 font-medium">Saved ✓</span>
        </>
      ) : (
        <>
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-700 font-medium">Saving...</span>
        </>
      )}
    </div>
  )
}

// ARIA Live Region for screen readers
export const SavingAnnouncements: React.FC = () => {
  const { pendingCount } = useSaving()
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (pendingCount > 0) {
      setAnnouncement('Saving changes')
    } else if (announcement === 'Saving changes') {
      setAnnouncement('Saved successfully')
      setTimeout(() => setAnnouncement(''), 1000)
    }
  }, [pendingCount, announcement])

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}

