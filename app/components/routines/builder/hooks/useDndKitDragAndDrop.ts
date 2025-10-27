import { useState, useCallback } from 'react'
import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { useToast } from '../../../../hooks/use-toast'
import type { Task, DaySpecificOrder, RecurringTemplate } from '../types/routineBuilderTypes'

interface CalendarTasks {
  groups: any[]
  individualTasks: Task[]
}

interface DraggedTask {
  task: Task
  day: string
  memberId: string
  isCopyOperation?: boolean
}

interface DragOverPosition {
  day: string
  memberId: string
  position: 'before' | 'after'
  targetTaskId?: string
}

interface HoveredDropZone {
  day: string
  memberId: string
}

export const useDndKitDragAndDrop = (
  calendarTasks: Record<string, CalendarTasks>,
  updateCalendarTasks: (updater: (prev: any) => any) => void,
  extractRoutineTaskIdFromId: (id: string) => string,
  currentRoutineId: string | null,
  saveDaySpecificOrder: (day: string, memberId: string, tasks: Task[]) => Promise<void>,
  recurringTemplates: RecurringTemplate[] = [],
  reloadRoutineData?: () => Promise<void>,
  onOpenEditModal?: (task: Task) => void
) => {
  const { toast } = useToast()
  
  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState<DraggedTask | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<DragOverPosition | null>(null)
  const [hoveredDropZone, setHoveredDropZone] = useState<HoveredDropZone | null>(null)
  const [dayOrders, setDayOrders] = useState<DaySpecificOrder[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isOptimisticUpdate, setIsOptimisticUpdate] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const [reorderingDay, setReorderingDay] = useState<string | null>(null)
  const [sourceDay, setSourceDay] = useState<string | null>(null)

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const data = active.data.current
    
    if (!data) {
      console.log('[DND-KIT] No data found in active element')
      return
    }
    
    const { task, day, memberId, isCopyOperation } = data
    
    console.log('[DND-KIT] 🚀 Drag start:', { task: task.name, day, memberId, isCopyOperation })
    
    setDraggedTask({ task, day, memberId, isCopyOperation })
    setIsDragging(true)
  }, [])

  // Handle drag over
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    
    if (!over) {
      setHoveredDropZone(null)
      setDragOverPosition(null)
      return
    }
    
    const overData = over.data.current
    if (!overData) return
    
    const { day, memberId, position, targetTaskId } = overData
    
    console.log('[DND-KIT] 🎯 Drag over:', { day, memberId, position, targetTaskId })
    
    setHoveredDropZone({ day, memberId })
    setDragOverPosition({ day, memberId, position, targetTaskId })
  }, [])

  const moveTaskToPosition = useCallback(async (task: Task, sourceDay: string, sourceMemberId: string, targetDay: string, targetMemberId: string, dragOverPosition: DragOverPosition | null) => {
    if (!currentRoutineId) {
      console.error('[DND-KIT] ❌ No routine ID available for reordering')
      return
    }

    console.log('[DND-KIT] 🚀 moveTaskToPosition called!', {
      taskName: task.name,
      sourceDay,
      targetDay,
      sourceMemberId,
      targetMemberId,
      dragOverPosition,
      currentRoutineId,
      sourceDayTasks: calendarTasks[sourceDay]?.individualTasks?.length || 0,
      targetDayTasks: calendarTasks[targetDay]?.individualTasks?.length || 0
    })

    // Calculate the new order
    const sourceDayTasks = calendarTasks[sourceDay]
    const targetDayTasks = calendarTasks[targetDay]
    let calculatedTaskOrder: Task[] = []
    
    if (sourceDay === targetDay && sourceMemberId === targetMemberId) {
      // Same day reordering
      const memberTasks = sourceDayTasks.individualTasks.filter((t: Task) => {
        const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
        return taskMemberId === sourceMemberId
      })
      
      // Remove the dragged task from the list
      const filteredTasks = memberTasks.filter((t: Task) => t.id !== task.id)
      
      // Insert at new position
      if (dragOverPosition?.targetTaskId) {
        const targetIndex = filteredTasks.findIndex((t: Task) => t.id === dragOverPosition.targetTaskId)
        if (targetIndex !== -1) {
          const insertIndex = dragOverPosition.position === 'before' ? targetIndex : targetIndex + 1
          filteredTasks.splice(insertIndex, 0, task)
        } else {
          filteredTasks.push(task)
        }
      } else {
        filteredTasks.push(task)
      }
      
      calculatedTaskOrder = filteredTasks
    } else {
      // Cross-day reordering
      const updatedTask = { ...task, memberId: targetMemberId }
      let newTargetTasks = [...targetDayTasks.individualTasks]
      
      if (dragOverPosition?.targetTaskId) {
        const targetIndex = newTargetTasks.findIndex((t: Task) => t.id === dragOverPosition.targetTaskId)
        if (targetIndex !== -1) {
          const insertIndex = dragOverPosition.position === 'before' ? targetIndex : targetIndex + 1
          newTargetTasks.splice(insertIndex, 0, updatedTask)
        } else {
          newTargetTasks.push(updatedTask)
        }
      } else {
        newTargetTasks.push(updatedTask)
      }
      
      calculatedTaskOrder = newTargetTasks.filter((t: Task) => {
        const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
        return taskMemberId === targetMemberId
      })
    }

    // Update UI state
    console.log('[DND-KIT] 🔄 Updating UI state:', {
      sourceDay,
      targetDay,
      sourceMemberId,
      targetMemberId,
      isSameDay: sourceDay === targetDay,
      isSameMember: sourceMemberId === targetMemberId,
      calculatedTaskOrderLength: calculatedTaskOrder.length
    })
    
    if (sourceDay === targetDay && sourceMemberId === targetMemberId) {
      // Same day, same member - simple reordering
      console.log('[DND-KIT] 📌 Same day/member - simple reordering')
      updateCalendarTasks(prev => {
        const newCalendarTasks = { ...prev }
        newCalendarTasks[sourceDay] = {
          ...newCalendarTasks[sourceDay],
          individualTasks: calculatedTaskOrder
        }
        console.log('[DND-KIT] ✅ Updated same day/member tasks:', newCalendarTasks[sourceDay].individualTasks.length)
        return newCalendarTasks
      })
    } else {
      // Cross-day or cross-member moves
      console.log('[DND-KIT] 📌 Cross-day or cross-member move')
      updateCalendarTasks(prev => {
        const newCalendarTasks = { ...prev }
        
        // Log before state
        console.log('[DND-KIT] 📋 Before update - source day tasks:', newCalendarTasks[sourceDay]?.individualTasks.length)
        console.log('[DND-KIT] 📋 Before update - target day tasks:', newCalendarTasks[targetDay]?.individualTasks.length)
        
        // Remove from source day/member
        newCalendarTasks[sourceDay] = {
          ...newCalendarTasks[sourceDay],
          individualTasks: newCalendarTasks[sourceDay].individualTasks.filter((t: Task) => {
            const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
            return !(taskMemberId === sourceMemberId && t.routine_task_id === task.routine_task_id)
          })
        }
        
        // Add to target day/member
        newCalendarTasks[targetDay] = {
          ...newCalendarTasks[targetDay],
          individualTasks: calculatedTaskOrder
        }
        
        console.log('[DND-KIT] 📋 After update - source day tasks:', newCalendarTasks[sourceDay].individualTasks.length)
        console.log('[DND-KIT] 📋 After update - target day tasks:', newCalendarTasks[targetDay].individualTasks.length)
        
        return newCalendarTasks
      })
    }

    // Save the new order to backend
    if (calculatedTaskOrder.length > 0) {
      try {
        console.log('[DND-KIT] 💾 Saving new order to backend for day:', targetDay)
        
        // If it's a cross-day move, update the task's day assignment
        if (sourceDay !== targetDay) {
          console.log('[DND-KIT] 🔄 Cross-day move detected, updating day assignment')
          
          // For recurring tasks, update the template
          if (task.recurring_template_id) {
            console.log('[DND-KIT] 📋 Recurring task detected, updating template:', task.recurring_template_id)
            const { updateTemplateDays } = await import('../../../../lib/api')
            await updateTemplateDays(currentRoutineId, task.recurring_template_id, {
              days_of_week: [targetDay]
            })
            console.log('[DND-KIT] ✅ Recurring template day assignment updated in backend')
          } else {
            // For non-recurring tasks, update the individual task
            console.log('[DND-KIT] 📋 Non-recurring task detected, updating individual task')
            const { patchRoutineTask } = await import('../../../../lib/api')
            await patchRoutineTask(currentRoutineId, task.routine_task_id || extractRoutineTaskIdFromId(task.id), {
              days_of_week: [targetDay]
            })
            console.log('[DND-KIT] ✅ Individual task day assignment updated in backend')
          }
        }
        
        // If it's a member transfer, update the task's member assignment
        if (sourceMemberId !== targetMemberId) {
          console.log('[DND-KIT] 🔄 Member transfer detected, updating member assignment')
          
          try {
            const { createTaskAssignment, getRoutineAssignments } = await import('../../../../lib/api')
            
            // Get current assignments to find the assignment ID for this task
            const assignments = await getRoutineAssignments(currentRoutineId)
            const routineTaskId = task.routine_task_id || extractRoutineTaskIdFromId(task.id)
            
            // Find the current assignment for the source member
            const currentAssignment = assignments.find(a => 
              a.routine_task_id === routineTaskId && 
              a.member_id === sourceMemberId
            )
            
            if (currentAssignment) {
              // Delete the old assignment
              const { deleteTaskAssignment } = await import('../../../../lib/api')
              await deleteTaskAssignment(currentRoutineId, routineTaskId, currentAssignment.id)
              console.log('[DND-KIT] ✅ Deleted old assignment for source member')
              
              // Create new assignment for target member
              await createTaskAssignment(currentRoutineId, routineTaskId, targetMemberId, 0)
              console.log('[DND-KIT] ✅ Created new assignment for target member')
            } else {
              console.log('[DND-KIT] ⚠️ Could not find current assignment to transfer')
            }
          } catch (error) {
            console.error('[DND-KIT] ❌ Failed to update member assignment:', error)
          }
          
          // Reload the routine data to get the updated assignments
          if (reloadRoutineData) {
            await reloadRoutineData()
            console.log('[DND-KIT] ✅ Routine data reloaded to reflect member assignment change')
          }
        }
        
        await saveDaySpecificOrder(targetDay, targetMemberId, calculatedTaskOrder)
        console.log('[DND-KIT] ✅ Day-specific order saved successfully')
        
        // Update the local day orders instead of reloading all data
        loadDayOrders()
        console.log('[DND-KIT] ✅ Day orders updated locally')
      } catch (error) {
        console.error('[DND-KIT] ❌ Failed to save day-specific order:', error)
      }
    }
  }, [currentRoutineId, calendarTasks, extractRoutineTaskIdFromId, updateCalendarTasks, saveDaySpecificOrder, reloadRoutineData])

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    
    console.log('[DND-KIT] 🎯 Drag end:', { active: active.id, over: over?.id })
    
    // Clear drag state
    setDraggedTask(null)
    setDragOverPosition(null)
    setHoveredDropZone(null)
    setIsDragging(false)
    
    if (!over) {
      console.log('[DND-KIT] No drop target')
      return
    }
    
    const activeData = active.data.current
    const overData = over.data.current
    
    if (!activeData || !overData) {
      console.log('[DND-KIT] Missing data in active or over element')
      return
    }
    
    const { task: draggedTaskData, day: sourceDay, memberId: sourceMemberId, isCopyOperation } = activeData
    const { day: targetDay, memberId: targetMemberId, position, targetTaskId } = overData
    
    console.log('[DND-KIT] 🎯 Drop event:', {
      sourceDay,
      sourceMemberId,
      targetDay,
      targetMemberId,
      position,
      targetTaskId,
      isCopyOperation,
      taskName: draggedTaskData.name,
      overId: over.id,
      activeId: active.id
    })
    
    // Determine operation type
    const isSameDay = sourceDay === targetDay
    const isSameMember = sourceMemberId === targetMemberId
    const isMemberTransfer = !isSameMember
    const isDayChange = !isSameDay
    const isRecurringTask = !!draggedTaskData.recurring_template_id
    
    console.log('[DND-KIT] Operation type:', {
      isSameDay,
      isSameMember,
      isMemberTransfer,
      isDayChange,
      isRecurringTask,
      operationType: isCopyOperation ? 'COPY' : isMemberTransfer ? 'MEMBER_TRANSFER' : isDayChange ? 'DAY_CHANGE' : 'REORDER'
    })
    
    // For recurring tasks:
    // - Allow reordering within same day/member
    // - Allow member transfer (changing task assignment)
    // - Open edit modal ONLY for cross-day moves
    if (isRecurringTask && isDayChange) {
      console.log('[DND-KIT] ⚠️ Recurring task - preventing cross-day move, opening edit modal')
      
      // Open the edit modal if callback is provided
      if (onOpenEditModal) {
        onOpenEditModal(draggedTaskData)
      } else {
        toast({
          title: "Recurring task limitation",
          description: "To move a recurring task to another day, please use the Edit Task dialog.",
        })
      }
      
      return
    }
    
    // For non-recurring tasks, all moves are allowed
    // For recurring tasks, allow member transfer but block day changes
    
    // Create drag over position for the move operation
    const dragOverPosition: DragOverPosition = {
      day: targetDay,
      memberId: targetMemberId,
      position,
      targetTaskId
    }
    
    // Implement actual drop logic using the existing moveTaskToPosition function
    try {
      // Set reordering state to show loading spinner on both source and target days
      setIsReordering(true)
      setReorderingDay(targetDay)
      setSourceDay(sourceDay)
      
      console.log('[DND-KIT] 🚀 Starting moveTaskToPosition:', {
        taskName: draggedTaskData.name,
        sourceDay,
        sourceMemberId,
        targetDay,
        targetMemberId,
        dragOverPosition
      })
      
      await moveTaskToPosition(draggedTaskData, sourceDay, sourceMemberId, targetDay, targetMemberId, dragOverPosition)
      
      console.log('[DND-KIT] ✅ moveTaskToPosition completed successfully')
      
      // Clear reordering state after successful move
      setIsReordering(false)
      setReorderingDay(null)
      setSourceDay(null)
      
      toast({
        title: "Task moved",
        description: `Moved ${draggedTaskData.name} to ${targetDay}`,
      })
      
      console.log('[DND-KIT] ✅ Task drop completed successfully')
    } catch (error) {
      console.error('[DND-KIT] ❌ Error during task drop:', error)
      
      // Clear reordering state on error
      setIsReordering(false)
      setReorderingDay(null)
      setSourceDay(null)
      
      toast({
        title: "Error",
        description: "Failed to move task",
        variant: "destructive",
      })
    }
  }, [toast, moveTaskToPosition])

  // Placeholder functions for compatibility
  const handleTaskDragStart = useCallback((e: any, task: Task, day: string, memberId: string) => {
    // This will be replaced by @dnd-kit's handleDragStart
    console.log('[DND-KIT] Legacy drag start called - should use @dnd-kit instead')
  }, [])

  const handleTaskDragOver = useCallback((e: any, day: string, memberId: string, position: 'before' | 'after', targetTaskId?: string) => {
    // This will be replaced by @dnd-kit's handleDragOver
    console.log('[DND-KIT] Legacy drag over called - should use @dnd-kit instead')
  }, [])

  const handleTaskDragLeave = useCallback(() => {
    setHoveredDropZone(null)
    setDragOverPosition(null)
  }, [])

  const handleTaskDrop = useCallback(async (e: any, targetDay: string, targetMemberId: string) => {
    // This will be replaced by @dnd-kit's handleDragEnd
    console.log('[DND-KIT] Legacy drop called - should use @dnd-kit instead')
  }, [])

  const handleTaskDragEnd = useCallback(() => {
    setDraggedTask(null)
    setDragOverPosition(null)
    setHoveredDropZone(null)
    setIsDragging(false)
  }, [])

  const getTasksWithDayOrder = useCallback((tasks: Task[], day: string, memberId: string): Task[] => {
    if (!dayOrders || !dayOrders.length) {
      return tasks
    }

    // Find day-specific orders for this member/day
    const memberDayOrders = dayOrders.filter(order => {
      return order.member_id === memberId && order.day_of_week === day
    })

    if (!memberDayOrders.length) {
      return tasks
    }

    // Sort tasks by their day-specific order
    return tasks.sort((a, b) => {
      const routineTaskIdA = a.routine_task_id || extractRoutineTaskIdFromId(a.id)
      const routineTaskIdB = b.routine_task_id || extractRoutineTaskIdFromId(b.id)
      
      const orderA = memberDayOrders.find(order => order.routine_task_id === routineTaskIdA)
      const orderB = memberDayOrders.find(order => order.routine_task_id === routineTaskIdB)
      
      if (!orderA && !orderB) return 0
      if (!orderA) return 1
      if (!orderB) return -1
      
      return orderA.order_index - orderB.order_index
    })
  }, [dayOrders, extractRoutineTaskIdFromId])

  const loadDayOrders = useCallback((dayOrders: DaySpecificOrder[]) => {
    setDayOrders(dayOrders)
  }, [])

  return {
    // State
    draggedTask,
    dragOverPosition,
    hoveredDropZone,
    dayOrders,
    isDragging,
    isReordering,
    reorderingDay,
    sourceDay,
    
    // Setters
    setDraggedTask,
    setDragOverPosition,
    setDayOrders,
    setIsDragging,
    
    // @dnd-kit handlers
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    
    // Legacy handlers (for compatibility during migration)
    handleTaskDragStart,
    handleTaskDragOver,
    handleTaskDragLeave,
    handleTaskDrop,
    handleTaskDragEnd,
    moveTaskToPosition,
    getTasksWithDayOrder,
    loadDayOrders
  }
}
