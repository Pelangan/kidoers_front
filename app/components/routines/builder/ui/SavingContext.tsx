"use client"

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

interface SavingContextType {
  pendingCount: number
  pendingOperations: Set<string>
  begin: (opKey?: string) => () => void
  isPending: (opKey?: string) => boolean
}

const SavingContext = createContext<SavingContextType | undefined>(undefined)

export const SavingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set())
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const begin = useCallback((opKey?: string) => {
    const key = opKey || `operation-${Date.now()}-${Math.random()}`
    
    setPendingCount(prev => prev + 1)
    setPendingOperations(prev => new Set([...prev, key]))

    // Return cleanup function
    return () => {
      setPendingCount(prev => Math.max(0, prev - 1))
      setPendingOperations(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
      
      // Clear any debounce timer for this operation
      const timer = debounceTimers.current.get(key)
      if (timer) {
        clearTimeout(timer)
        debounceTimers.current.delete(key)
      }
    }
  }, [])

  const isPending = useCallback((opKey?: string) => {
    if (!opKey) {
      return pendingCount > 0
    }
    return pendingOperations.has(opKey)
  }, [pendingCount, pendingOperations])

  return (
    <SavingContext.Provider value={{ pendingCount, pendingOperations, begin, isPending }}>
      {children}
    </SavingContext.Provider>
  )
}

export const useSaving = () => {
  const context = useContext(SavingContext)
  if (!context) {
    throw new Error('useSaving must be used within SavingProvider')
  }
  return context
}

