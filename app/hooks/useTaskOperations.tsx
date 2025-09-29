"use client"

import React, { useState, useCallback } from "react"
import { useToast } from "./use-toast"
import { ToastAction } from "../../components/ui/toast"

interface TaskOperation {
  id: string
  type: 'delete' | 'update'
  taskData: any
  originalCalendarTasks: any
  undoFunction: () => Promise<void>
}

export function useTaskOperations() {
  const { toast } = useToast()
  const [pendingOperations, setPendingOperations] = useState<TaskOperation[]>([])

  const showUndoToast = useCallback((operation: TaskOperation, message: string) => {
    toast({
      title: message,
      description: "This action can be undone.",
      action: (
        <ToastAction
          altText="Undo"
          onClick={async () => {
            try {
              await operation.undoFunction()
              toast({
                title: "Action undone",
                description: "The task has been restored.",
                variant: "default",
              })
            } catch (error) {
              console.error("Error undoing operation:", error)
              toast({
                title: "Unable to undo",
                description: "There was an error restoring the task.",
                variant: "destructive",
              })
            }
          }}
        >
          Undo
        </ToastAction>
      ) as any,
      variant: "default",
    })

    // Auto-remove from pending operations after 5 seconds
    setTimeout(() => {
      setPendingOperations(prev => prev.filter(op => op.id !== operation.id))
    }, 5000)
  }, [toast])

  const addPendingOperation = useCallback((operation: TaskOperation) => {
    setPendingOperations(prev => [...prev, operation])
  }, [])

  const removePendingOperation = useCallback((operationId: string) => {
    setPendingOperations(prev => prev.filter(op => op.id !== operationId))
  }, [])

  return {
    showUndoToast,
    addPendingOperation,
    removePendingOperation,
    pendingOperations
  }
}