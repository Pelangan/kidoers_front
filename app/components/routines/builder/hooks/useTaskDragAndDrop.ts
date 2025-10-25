import { useState, useEffect } from 'react'
import { bulkUpdateDayOrders, updateTemplateDays } from '../../../../lib/api'
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

export const useTaskDragAndDrop = (
  calendarTasks: Record<string, CalendarTasks>,
  updateCalendarTasks: (updater: (prev: any) => any) => void,
  extractRoutineTaskIdFromId: (id: string) => string,
  currentRoutineId: string | null,
  saveDaySpecificOrder: (day: string, memberId: string, tasks: Task[]) => Promise<void>,
  recurringTemplates: RecurringTemplate[] = [],
  reloadRoutineData?: () => Promise<void>
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

  // Update body class when dragging
  useEffect(() => {
    console.log('[CURSOR-DEBUG] isDragging changed to:', isDragging)
    if (isDragging) {
      document.body.classList.add('dragging')
    } else {
      document.body.classList.remove('dragging')
    }

    return () => {
      document.body.classList.remove('dragging')
    }
  }, [isDragging])

  // Task reordering handlers
  const handleTaskDragStart = (e: React.DragEvent, task: Task, day: string, memberId: string) => {
    console.log('=== DRAG START DEBUG ===')
    console.log('[DRAG-ORDER] 🚀 DRAG START EVENT TRIGGERED!', { task: task.name, day, memberId })
    console.log('[DRAG-ORDER] 🔧 DEBUG: handleTaskDragStart called with:', { task, day, memberId })
    console.log('🚀 BASIC DRAG START - Task:', task.name, 'Day:', day, 'Member:', memberId)
    console.log('=== END DRAG START DEBUG ===')
    
    // Check if this is a copy operation (Option/Alt key held)
    const isCopyOperation = e.altKey || e.metaKey
    
    if (isCopyOperation) {
      e.dataTransfer.effectAllowed = 'copy'
      console.log('[DRAG-ORDER] 📋 Copy operation detected (Option/Alt key held)')
    } else {
      e.dataTransfer.effectAllowed = 'move'
    }
    
    // Set data for better browser compatibility
    e.dataTransfer.setData('text/plain', task.id) // Use task ID instead of empty string
    e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, day, memberId }))
    
    // Set drag image to the task element itself for better visual feedback
    try {
      if (e.currentTarget instanceof HTMLElement) {
        e.dataTransfer.setDragImage(e.currentTarget, 0, 0)
      }
    } catch (error) {
      console.warn('[DRAG-ORDER] Could not set drag image:', error)
    }
    
    // Store the dragged task info
    console.log('[DRAG-ORDER] 📝 Storing dragged task:', { task: task.name, day, memberId, isCopyOperation })
    
    setDraggedTask({ task, day, memberId, isCopyOperation })
    setIsDragging(true)
    console.log('[DRAG-ORDER] ✅ Started dragging task:', task.name, 'from day:', day, 'member:', memberId, 'copy:', isCopyOperation)
    console.log('[CURSOR-DEBUG] Set isDragging to true')
  }

  const handleTaskDragOver = (e: React.DragEvent, day: string, memberId: string, position: 'before' | 'after', targetTaskId?: string) => {
    console.log('[DRAG-ORDER] 🎯 Drag over event received:', { day, memberId, position, targetTaskId, draggedTask: draggedTask?.task.name })
    
    if (!draggedTask) {
      console.log('[DRAG-ORDER] ❌ No dragged task, ignoring drag over')
      return
    }
    
    e.preventDefault()
    
    // Set the hovered drop zone
    setHoveredDropZone({ day, memberId })
    
    // Set the appropriate drop effect based on operation type
    if (draggedTask.isCopyOperation) {
      e.dataTransfer.dropEffect = 'copy'
    } else {
      e.dataTransfer.dropEffect = 'move'
    }
    
    const newDragOverPosition = { day, memberId, position, targetTaskId }
    
    // Only log when position actually changes to reduce noise
    if (!dragOverPosition || 
        dragOverPosition.day !== newDragOverPosition.day ||
        dragOverPosition.memberId !== newDragOverPosition.memberId ||
        dragOverPosition.position !== newDragOverPosition.position ||
        dragOverPosition.targetTaskId !== newDragOverPosition.targetTaskId) {
      console.log('[DRAG-ORDER] 🎯 Drag over position:', newDragOverPosition)
      console.log('[DRAG-ORDER] 🎯 Previous drag over position:', dragOverPosition)
    }
    
    setDragOverPosition(newDragOverPosition)
  }

  const handleTaskDragLeave = () => {
    setDragOverPosition(null)
    setHoveredDropZone(null)
  }

  const handleTaskDrop = async (e: React.DragEvent, targetDay: string, targetMemberId: string) => {
    console.log('[DEBUG-DRAG] 🎯 DROP EVENT TRIGGERED!', { targetDay, targetMemberId, draggedTask: draggedTask?.task.name })
    console.log('🎯 BASIC DROP EVENT - Target Day:', targetDay, 'Target Member:', targetMemberId, 'Dragged Task:', draggedTask?.task.name)
    
    if (!draggedTask) {
      console.log('[DEBUG-DRAG] ❌ No dragged task on drop')
      console.log('❌ BASIC DROP - No dragged task found!')
      return
    }
    
    e.preventDefault()
    
    const { task, day: sourceDay, memberId: sourceMemberId, isCopyOperation } = draggedTask
    
    console.log('[DEBUG-DRAG] 🎯 DROP EVENT:', {
      sourceDay,
      sourceMemberId,
      targetDay,
      targetMemberId,
      dragOverPosition,
      isCopyOperation,
      taskName: task.name,
      taskId: task.id,
      hasRecurringTemplateId: !!task.recurring_template_id
    })

    // Determine operation type
    const isSameDay = sourceDay === targetDay
    const isSameMember = sourceMemberId === targetMemberId
    const isMemberTransfer = !isSameMember
    const isDayChange = !isSameDay

    console.log('[DEBUG-DRAG] 🧮 Operation type analysis:', {
      isSameDay,
      isSameMember,
      isMemberTransfer,
      isDayChange,
      isCopyOperation,
      operationType: isCopyOperation ? 'COPY' : isMemberTransfer ? 'MEMBER_TRANSFER' : isDayChange ? 'DAY_CHANGE' : 'REORDER'
    })

    // Handle different operation types
    if (isCopyOperation) {
      console.log('[DEBUG-DRAG] 📋 Executing COPY operation')
      await handleCopyOperation(task, sourceDay, sourceMemberId, targetDay, targetMemberId, dragOverPosition)
    } else if (isMemberTransfer) {
      console.log('[DEBUG-DRAG] 👤 Executing MEMBER_TRANSFER operation')
      await handleMemberTransfer(task, sourceDay, sourceMemberId, targetDay, targetMemberId, dragOverPosition)
    } else if (isDayChange) {
      console.log('[DEBUG-DRAG] 📅 Executing DAY_CHANGE operation')
      await handleDayChange(task, sourceDay, sourceMemberId, targetDay, targetMemberId, dragOverPosition)
    } else {
      console.log('[DEBUG-DRAG] 🔄 Executing REORDER operation')
      // Same day, same member - reorder only
      setIsReordering(true)
      setReorderingDay(targetDay)
      try {
        await handleReorder(task, sourceDay, sourceMemberId, dragOverPosition)
      } finally {
        setIsReordering(false)
        setReorderingDay(null)
      }
    }
    
    // Clear drag state
    setDraggedTask(null)
    setDragOverPosition(null)
    setHoveredDropZone(null)
    setIsDragging(false)
  }

  const handleTaskDragEnd = () => {
    setDraggedTask(null)
    setDragOverPosition(null)
    setHoveredDropZone(null)
    setIsDragging(false)
  }

  // New operation handlers
  const handleCopyOperation = async (
    task: Task,
    sourceDay: string,
    sourceMemberId: string,
    targetDay: string,
    targetMemberId: string,
    dragOverPosition: DragOverPosition | null
  ) => {
    console.log('[DRAG-ORDER] 📋 COPY OPERATION:', {
      taskName: task.name,
      sourceDay,
      sourceMemberId,
      targetDay,
      targetMemberId
    })

    // For copy operations, we need to create a new task for the target member/day
    // This is a complex operation that would require creating a new recurring template
    // For now, we'll show a toast message indicating this feature is coming soon
    console.log('[DRAG-ORDER] 📋 Copy operation - feature coming soon')
    
    toast({
      title: "Copy feature coming soon",
      description: "Copy functionality will be available in a future update."
    })
    
    // TODO: Implement copy functionality
    // This would involve:
    // 1. Creating a new recurring template based on the source task
    // 2. Assigning it to the target member
    // 3. Setting the appropriate days
    // 4. Updating the UI optimistically
  }

  const handleMemberTransfer = async (
    task: Task,
    sourceDay: string,
    sourceMemberId: string,
    targetDay: string,
    targetMemberId: string,
    dragOverPosition: DragOverPosition | null
  ) => {
    console.log('[DRAG-ORDER] 👤 MEMBER TRANSFER:', {
      taskName: task.name,
      sourceDay,
      sourceMemberId,
      targetDay,
      targetMemberId
    })

    // For member transfer, we need to:
    // 1. Update the task's assignees to remove source member and add target member
    // 2. Handle day changes if applicable
    // 3. Update recurring template if needed
    
    // TODO: Implement member transfer functionality
    console.log('[DRAG-ORDER] 👤 Member transfer - feature coming soon')
    
    toast({
      title: "Member transfer coming soon",
      description: "Transferring tasks between members will be available in a future update."
    })
  }

  const handleDayChange = async (
    task: Task,
    sourceDay: string,
    sourceMemberId: string,
    targetDay: string,
    targetMemberId: string,
    dragOverPosition: DragOverPosition | null
  ) => {
    console.log('[DEBUG-DRAG] 📅 handleDayChange called!', {
      taskName: task.name,
      taskId: task.id,
      sourceDay,
      sourceMemberId,
      targetDay,
      targetMemberId,
      dragOverPosition,
      hasRecurringTemplateId: !!task.recurring_template_id,
      recurringTemplateId: task.recurring_template_id
    })

    try {
      // For day changes, we can use the existing moveTaskToPosition logic
      console.log('[DEBUG-DRAG] 🚀 Calling moveTaskToPosition for day change')
      await moveTaskToPosition(task, sourceDay, sourceMemberId, targetDay, targetMemberId, dragOverPosition)
      
      // Show success toast
      toast({
        title: "Task moved",
        description: `Moved ${task.name} to ${targetDay}`
      })
      console.log('[DEBUG-DRAG] ✅ Day change completed successfully')
    } catch (error) {
      console.error('[DEBUG-DRAG] ❌ Day change failed:', error)
      console.error('[DEBUG-DRAG] ❌ Error details:', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        taskName: task.name,
        sourceDay,
        targetDay
      })
      toast({
        title: "Move failed",
        description: "Couldn't save changes. Try again.",
        variant: "destructive"
      })
    }
  }

  const handleReorder = async (
    task: Task,
    sourceDay: string,
    sourceMemberId: string,
    dragOverPosition: DragOverPosition | null
  ) => {
    console.log('[DRAG-ORDER] 🔄 REORDER:', {
      taskName: task.name,
      sourceDay,
      sourceMemberId
    })

    try {
      // For reordering, we can use the existing moveTaskToPosition logic
      await moveTaskToPosition(task, sourceDay, sourceMemberId, sourceDay, sourceMemberId, dragOverPosition)
      
      // Show success toast
      toast({
        title: "Tasks reordered",
        description: `Reordered tasks for ${sourceDay}`
      })
    } catch (error) {
      console.error('[DRAG-ORDER] ❌ Reorder failed:', error)
      toast({
        title: "Reorder failed",
        description: "Couldn't save changes. Try again.",
        variant: "destructive"
      })
    }
  }

  const updateTaskTemplateDays = async (task: Task, targetDay: string) => {
    console.log('[DEBUG-DRAG] 🚀 updateTaskTemplateDays called!', {
      taskName: task.name,
      taskId: task.id,
      targetDay,
      currentRoutineId,
      hasRecurringTemplateId: !!task.recurring_template_id,
      recurringTemplateId: task.recurring_template_id
    })

    if (!currentRoutineId || !task.recurring_template_id) {
      console.log('[DEBUG-DRAG] ❌ Missing required data:', {
        hasCurrentRoutineId: !!currentRoutineId,
        hasRecurringTemplateId: !!task.recurring_template_id,
        currentRoutineId,
        recurringTemplateId: task.recurring_template_id
      })
      return
    }

    try {
      console.log('[DEBUG-DRAG] 📅 Updating template days for task:', task.name)
      console.log('[DEBUG-DRAG] 🔍 Task details:', {
        id: task.id,
        routine_task_id: task.routine_task_id,
        recurring_template_id: task.recurring_template_id,
        name: task.name,
        memberId: task.memberId,
        assignees: task.assignees,
        member_count: task.member_count
      })
      
      // Find the recurring template for this task
      const template = recurringTemplates.find(t => t.id === task.recurring_template_id)
      
      console.log('[DEBUG-DRAG] 🔍 Template search:', {
        searchingForTemplateId: task.recurring_template_id,
        availableTemplates: recurringTemplates.map(t => ({ id: t.id, name: t.name })),
        templateFound: !!template
      })
      
      if (!template) {
        console.warn('[DEBUG-DRAG] ⚠️ Template not found for task:', task.name, 'template_id:', task.recurring_template_id)
        return
      }
      
      console.log('[DEBUG-DRAG] 🔍 Found template:', {
        id: template.id,
        name: template.name,
        days_of_week: template.days_of_week,
        frequency_type: template.frequency_type
      })

      console.log('[DEBUG-DRAG] 📋 Current template days:', template.days_of_week)
      console.log('[DEBUG-DRAG] 🎯 Target day:', targetDay)

      // Determine new days_of_week based on frequency_type
      let newDaysOfWeek: string[] = []

      console.log('[DEBUG-DRAG] 🧮 Calculating new days based on frequency_type:', template.frequency_type)

      if (template.frequency_type === 'just_this_day') {
        // For single-day tasks, replace with the new day
        newDaysOfWeek = [targetDay]
        console.log('[DEBUG-DRAG] ✏️ Single-day task (just_this_day): replacing with', targetDay)
      } else if (template.frequency_type === 'specific_days') {
        const currentDays = template.days_of_week || []
        
        console.log('[DEBUG-DRAG] 🔍 Specific days analysis:', {
          currentDays,
          currentDaysLength: currentDays.length,
          targetDay,
          includesTargetDay: currentDays.includes(targetDay)
        })
        
        // If it's a single-day specific_days task being moved, REPLACE the day (don't add)
        if (currentDays.length === 1) {
          newDaysOfWeek = [targetDay]
          console.log('[DEBUG-DRAG] ✏️ Single-day specific task: replacing', currentDays[0], 'with', targetDay)
        } 
        // If it's a multi-day task, ADD the new day if not already present
        else if (!currentDays.includes(targetDay)) {
          newDaysOfWeek = [...currentDays, targetDay].sort()
          console.log('[DEBUG-DRAG] ➕ Multi-day task: adding', targetDay, 'to existing days')
        } else {
          // Already includes this day, no update needed
          console.log('[DEBUG-DRAG] ✅ Task already includes', targetDay)
          return
        }
      } else if (template.frequency_type === 'every_day') {
        // Every day tasks already have all days, no update needed
        console.log('[DEBUG-DRAG] ℹ️ Every-day task: no update needed')
        return
      }

      console.log('[DEBUG-DRAG] 💾 Final newDaysOfWeek calculation:', {
        originalDays: template.days_of_week,
        newDaysOfWeek,
        changed: JSON.stringify(template.days_of_week) !== JSON.stringify(newDaysOfWeek)
      })

      // Update the template days in the backend and get the new task ID mapping
      console.log('[DEBUG-DRAG] 🚀 Calling updateTemplateDays API:', {
        routineId: currentRoutineId,
        templateId: template.id,
        payload: {
          days_of_week: newDaysOfWeek
        }
      })
      
      const updateResponse = await updateTemplateDays(currentRoutineId, template.id, {
        days_of_week: newDaysOfWeek
      }) as { day_to_task_id: Record<string, string> }

      console.log('[DEBUG-DRAG] ✅ Template days updated successfully')
      console.log('[DEBUG-DRAG] 📊 API Response:', updateResponse)
      console.log('[DEBUG-DRAG] 📊 New task ID mapping:', updateResponse.day_to_task_id)
      
      return updateResponse.day_to_task_id
    } catch (error) {
      console.error('[DEBUG-DRAG] ❌ Failed to update template days:', error)
      console.error('[DEBUG-DRAG] ❌ Error details:', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        taskName: task.name,
        targetDay,
        templateId: task.recurring_template_id
      })
      throw error
    }
  }

  const moveTaskToPosition = async (
    task: Task, 
    sourceDay: string, 
    sourceMemberId: string, 
    targetDay: string, 
    targetMemberId: string, 
    dragOverPosition: DragOverPosition | null
  ) => {
    if (!currentRoutineId) {
      console.error('[DRAG-ORDER] ❌ No routine ID available for reordering')
      return
    }

    console.log('[DRAG-ORDER] 🚀 moveTaskToPosition called!', {
      taskName: task.name,
      sourceDay,
      targetDay,
      sourceMemberId,
      targetMemberId,
      dragOverPosition,
      currentRoutineId
    })
    console.log('[DRAG-ORDER] 🔍 Source/Target comparison:', { 
      sourceDay, 
      targetDay, 
      sourceMemberId, 
      targetMemberId,
      isSameDay: sourceDay === targetDay,
      isSameMember: sourceMemberId === targetMemberId
    })

      // Google Calendar approach: Single optimistic UI update, then background sync
      let newTaskIdMapping: Record<string, string> | null = null
      if (sourceDay !== targetDay && task.recurring_template_id) {
        console.log('[DRAG-ORDER] 🎯 Google Calendar approach: Single optimistic UI update')
        
        // Step 1: Calculate the final position immediately
        const targetDayTasks = calendarTasks[targetDay]
        const existingTasks = targetDayTasks.individualTasks.filter((t: Task) => {
          const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
          return taskMemberId === targetMemberId
        })
        
        // Create the moved task with updated properties
        const movedTask = {
          ...task,
          id: `${task.routine_task_id}_${targetDay}`, // Temporary ID for UI
          memberId: targetMemberId
        }
        
        // Insert at correct position
        if (dragOverPosition?.targetTaskId) {
          const targetIndex = existingTasks.findIndex((t: Task) => t.id === dragOverPosition.targetTaskId)
          if (targetIndex !== -1) {
            const insertIndex = dragOverPosition.position === 'before' ? targetIndex : targetIndex + 1
            existingTasks.splice(insertIndex, 0, movedTask)
            console.log('[DRAG-ORDER] 🎯 Inserted at final position:', insertIndex)
          } else {
            existingTasks.push(movedTask)
          }
        } else {
          existingTasks.push(movedTask)
        }
        
        // Step 2: Immediate optimistic UI update - Google Calendar style
        console.log('[DRAG-ORDER] 🎯 Immediate optimistic UI update - Google Calendar style')
        console.log('[DRAG-ORDER] 🔍 BEFORE optimistic update - existingTasks:', existingTasks.map(t => ({ id: t.id, name: t.name, routine_task_id: t.routine_task_id })))
        
        // Set flag to prevent day order sorting during optimistic update
        setIsOptimisticUpdate(true)
        console.log('[DRAG-ORDER] 🔧 Set isOptimisticUpdate = true')
        
        // Single UI update - move task directly to final position immediately
        updateCalendarTasks(prev => {
          console.log('[DRAG-ORDER] 🔄 updateCalendarTasks called - optimistic update')
          const newCalendarTasks = { ...prev }
          
          // Remove from source day
          newCalendarTasks[sourceDay] = {
            ...newCalendarTasks[sourceDay],
            individualTasks: newCalendarTasks[sourceDay].individualTasks.filter((t: Task) => {
              const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
              return !(taskMemberId === sourceMemberId && t.routine_task_id === task.routine_task_id)
            })
          }
          
          // Add to target day at correct position
          newCalendarTasks[targetDay] = {
            ...newCalendarTasks[targetDay],
            individualTasks: existingTasks
          }
          
          console.log('[DRAG-ORDER] 🔍 AFTER optimistic update - target day tasks:', newCalendarTasks[targetDay].individualTasks.map((t: Task) => ({ id: t.id, name: t.name, routine_task_id: t.routine_task_id })))
          return newCalendarTasks
        })
        
        console.log('[DRAG-ORDER] ✅ Immediate optimistic UI update completed - task moved to final position')
        
        // CRITICAL FIX: Clear drag state immediately after optimistic UI update to hide drop zones
        console.log('[DRAG-ORDER] 🔧 Clearing drag state immediately to hide drop zones')
        setDraggedTask(null)
        setDragOverPosition(null)
        setIsDragging(false)
        
        // Step 3: Background sync - update with correct routine_task_id silently
        console.log('[DRAG-ORDER] 🔄 Starting background sync...')
        
        try {
          // Update template in background
          newTaskIdMapping = await updateTaskTemplateDays(task, targetDay) || null
          console.log('[DRAG-ORDER] ✅ Background template update completed')
          
          // Store the correct routine_task_id for later use in backend call
          if (newTaskIdMapping && newTaskIdMapping[targetDay]) {
            console.log('[DRAG-ORDER] 🔧 Storing correct routine_task_id for backend call:', newTaskIdMapping[targetDay])
            // Update the movedTask object for backend call
            movedTask.routine_task_id = newTaskIdMapping[targetDay]
            movedTask.id = `${newTaskIdMapping[targetDay]}_${targetDay}`
            console.log('[DRAG-ORDER] ✅ Correct routine_task_id stored for backend call')
          }
          
          // Small delay to ensure database transaction is fully committed
          await new Promise(resolve => setTimeout(resolve, 200))
          console.log('[DRAG-ORDER] ✅ Background sync completed')
          
          // Keep optimistic update flag true until backend order is saved
          console.log('[DRAG-ORDER] 🔧 Keeping optimistic update flag true until backend order is saved')
          
        } catch (error) {
          console.error('[DRAG-ORDER] ❌ Background sync failed:', error)
          // Clear optimistic update flag even on error
          setIsOptimisticUpdate(false)
          // TODO: Revert optimistic update if needed
        }
      }

    // Calculate the new order BEFORE updating state
    const sourceDayTasks = calendarTasks[sourceDay]
    const targetDayTasks = calendarTasks[targetDay]
    let calculatedTaskOrder: Task[] = []
    
    if (sourceDay === targetDay && sourceMemberId === targetMemberId) {
      // Same day reordering
      console.log('[DRAG-ORDER] 🔍 Same-day reorder - BEFORE filtering:', {
        sourceDay,
        sourceMemberId,
        draggedTask: { id: task.id, name: task.name },
        dragOverPosition,
        allTasks: sourceDayTasks.individualTasks.map(t => ({ id: t.id, name: t.name, memberId: t.memberId }))
      })
      
      // Get all tasks for this member first
      const memberTasks = sourceDayTasks.individualTasks.filter((t: Task) => {
        const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
        return taskMemberId === sourceMemberId
      })
      
      console.log('[DRAG-ORDER] 🔍 Member tasks before reordering:', memberTasks.map(t => ({ id: t.id, name: t.name })))
      
      // Remove the dragged task from the list
      const filteredTasks = memberTasks.filter((t: Task) => t.id !== task.id)
      
      console.log('[DRAG-ORDER] 🔍 Tasks after removing dragged task:', filteredTasks.map(t => ({ id: t.id, name: t.name })))
      
      // Insert at new position
      if (dragOverPosition?.targetTaskId) {
        const targetIndex = filteredTasks.findIndex((t: Task) => t.id === dragOverPosition.targetTaskId)
        console.log('[DRAG-ORDER] 🔍 Target task found at index:', targetIndex, 'for task:', dragOverPosition.targetTaskId)
        
        if (targetIndex !== -1) {
          const insertIndex = dragOverPosition.position === 'before' ? targetIndex : targetIndex + 1
          filteredTasks.splice(insertIndex, 0, task)
          console.log('[DRAG-ORDER] 🔍 Inserted at index:', insertIndex, 'position:', dragOverPosition.position)
        } else {
          console.log('[DRAG-ORDER] 🔍 Target task not found, appending to end')
          filteredTasks.push(task)
        }
      } else {
        console.log('[DRAG-ORDER] 🔍 No target task specified, appending to end')
        filteredTasks.push(task)
      }
      
      calculatedTaskOrder = filteredTasks
      
      console.log('[DRAG-ORDER] 🔍 Same-day reorder - NEW order:', filteredTasks.map((t: Task) => ({ 
        id: t.id, 
        name: t.name, 
        memberId: t.memberId 
      })))
      console.log('[DRAG-ORDER] 🔍 Target member ID:', targetMemberId)
      console.log('[DRAG-ORDER] 🔍 Calculated task order length:', calculatedTaskOrder.length)
    } else {
      // Cross-day reordering
      const updatedTask = { ...task, memberId: targetMemberId }
      let newTargetTasks = [...targetDayTasks.individualTasks]
      
      console.log('[DRAG-ORDER] 🔍 Cross-day drag - BEFORE insertion:', {
        targetDay,
        targetMemberId,
        dragOverPosition,
        existingTasks: newTargetTasks.map(t => ({ id: t.id, name: t.name, memberId: t.memberId })),
        updatedTask: { id: updatedTask.id, name: updatedTask.name, memberId: updatedTask.memberId }
      })
      
      if (dragOverPosition?.targetTaskId) {
        const targetIndex = newTargetTasks.findIndex((t: Task) => t.id === dragOverPosition.targetTaskId)
        console.log('[DRAG-ORDER] 🔍 Target task found at index:', targetIndex, 'for task:', dragOverPosition.targetTaskId)
        
        if (targetIndex !== -1) {
          const insertIndex = dragOverPosition.position === 'before' ? targetIndex : targetIndex + 1
          console.log('[DRAG-ORDER] 🔍 Inserting at index:', insertIndex, 'position:', dragOverPosition.position)
          newTargetTasks.splice(insertIndex, 0, updatedTask)
        } else {
          console.log('[DRAG-ORDER] 🔍 Target task not found, appending to end')
          newTargetTasks.push(updatedTask)
        }
      } else {
        console.log('[DRAG-ORDER] 🔍 No target task specified, appending to end')
        newTargetTasks.push(updatedTask)
      }
      
      console.log('[DRAG-ORDER] 🔍 After insertion, before filtering:', newTargetTasks.map(t => ({ id: t.id, name: t.name, memberId: t.memberId })))
      
      if (sourceDay !== targetDay) {
        // For cross-day moves, we've already done the optimistic UI update and background sync
        // The UI now has the correct routine_task_id, so we can use it directly
        console.log('[DRAG-ORDER] 🔍 Cross-day move: using updated UI state with correct routine_task_id')
        
        // Get the current UI state and update with correct routine_task_id for backend
        calculatedTaskOrder = targetDayTasks.individualTasks.filter((t: Task) => {
          const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
          return taskMemberId === targetMemberId
        })
        
        // Update the moved task with correct routine_task_id for backend call
        if (newTaskIdMapping && newTaskIdMapping[targetDay]) {
          const movedTaskInOrder = calculatedTaskOrder.find(t => t.name === task.name)
          if (movedTaskInOrder) {
            movedTaskInOrder.routine_task_id = newTaskIdMapping[targetDay]
            movedTaskInOrder.id = `${newTaskIdMapping[targetDay]}_${targetDay}`
            console.log('[DRAG-ORDER] 🔧 Updated moved task in order with correct routine_task_id:', newTaskIdMapping[targetDay])
          }
        }
        
        console.log('[DRAG-ORDER] 🔍 Cross-day move: final order for backend:', calculatedTaskOrder.map(t => ({ 
          id: t.id, 
          name: t.name, 
          routine_task_id: t.routine_task_id,
          memberId: t.memberId
        })))
        
        // DEBUG: Check if Task 5 has correct routine_task_id
        const task5InOrder = calculatedTaskOrder.find(t => t.name === task.name)
        if (task5InOrder) {
          console.log('[DRAG-ORDER] 🔍 DEBUG Task 5 in final order:', {
            name: task5InOrder.name,
            routine_task_id: task5InOrder.routine_task_id,
            id: task5InOrder.id,
            hasCorrectId: !!task5InOrder.routine_task_id,
            newTaskIdMapping: newTaskIdMapping,
            targetDay: targetDay
          })
        } else {
          console.log('[DRAG-ORDER] ❌ DEBUG Task 5 NOT FOUND in final order!')
          
          // CRITICAL FIX: Add Task 5 to the order if it's missing
          console.log('[DRAG-ORDER] 🔧 Adding missing Task 5 to final order')
          
          const correctRoutineTaskId = newTaskIdMapping && newTaskIdMapping[targetDay] 
            ? newTaskIdMapping[targetDay] 
            : task.routine_task_id
            
          const missingTask5 = {
            ...task,
            id: `${correctRoutineTaskId}_${targetDay}`,
            memberId: targetMemberId,
            routine_task_id: correctRoutineTaskId
          }
          
          // Insert at correct position
          if (dragOverPosition?.targetTaskId) {
            const targetIndex = calculatedTaskOrder.findIndex((t: Task) => t.id === dragOverPosition.targetTaskId)
            if (targetIndex !== -1) {
              const insertIndex = dragOverPosition.position === 'before' ? targetIndex : targetIndex + 1
              calculatedTaskOrder.splice(insertIndex, 0, missingTask5)
              console.log('[DRAG-ORDER] 🔧 Inserted missing Task 5 at index:', insertIndex)
            } else {
              calculatedTaskOrder.push(missingTask5)
              console.log('[DRAG-ORDER] 🔧 Appended missing Task 5 to end')
            }
          } else {
            calculatedTaskOrder.push(missingTask5)
            console.log('[DRAG-ORDER] 🔧 Appended missing Task 5 to end')
          }
          
          console.log('[DRAG-ORDER] ✅ Task 5 added to final order:', {
            name: missingTask5.name,
            routine_task_id: missingTask5.routine_task_id,
            id: missingTask5.id
          })
        }
      } else {
        // Same-day reordering
        calculatedTaskOrder = newTargetTasks.filter((t: Task) => {
          const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
          const matches = taskMemberId === targetMemberId
          console.log('[DRAG-ORDER] 🔍 Filtering task (same-day):', { id: t.id, name: t.name, taskMemberId, targetMemberId, matches })
          return matches
        })
      }
      
      console.log('[DRAG-ORDER] 🔍 Cross-day reorder - NEW order for', targetDay, ':', calculatedTaskOrder.map((t: Task) => ({ 
        id: t.id, 
        name: t.name, 
        memberId: t.memberId 
      })))
    }
    
    console.log('[DRAG-ORDER] 📊 Calculated task order, length:', calculatedTaskOrder.length)
    console.log('[DRAG-ORDER] 📊 Calculated task order contents:', calculatedTaskOrder.map((t: Task) => ({ id: t.id, name: t.name })))
    
    // Now update state
    if (sourceDay === targetDay && sourceMemberId === targetMemberId) {
      // Same day - update with calculated order
      updateCalendarTasks(prev => {
        const newCalendarTasks = { ...prev }
        newCalendarTasks[sourceDay] = {
          ...newCalendarTasks[sourceDay],
          individualTasks: calculatedTaskOrder
        }
        return newCalendarTasks
      })
    } else {
      // Cross-day moves: We already did the optimistic UI update, skip additional updates
      console.log('[DRAG-ORDER] 🔄 Cross-day move: skipping additional UI updates (optimistic update already completed)')
    }

    // Save the new order to backend
    if (calculatedTaskOrder.length > 0) {
      try {
        console.log('[DRAG-ORDER] 💾 Saving new order to backend for day:', targetDay)
        console.log('[DRAG-ORDER] 🔍 Final task order:', calculatedTaskOrder.map(t => ({ id: t.id, name: t.name, memberId: t.memberId })))
        
        // Use the passed saveDaySpecificOrder function
        console.log('[DRAG-ORDER] 🎯 About to call saveDaySpecificOrder with:', {
          day: targetDay,
          memberId: targetMemberId,
          tasks: calculatedTaskOrder.map(t => ({ id: t.id, name: t.name }))
        })
        await saveDaySpecificOrder(targetDay, targetMemberId, calculatedTaskOrder)

        console.log('[DRAG-ORDER] ✅ Day-specific order saved successfully')
        
        // Force a reload of the routine data to get the updated day orders
        console.log('[DRAG-ORDER] 🔄 Triggering routine data reload to get updated day orders')
        if (reloadRoutineData) {
          await reloadRoutineData()
          console.log('[DRAG-ORDER] ✅ Routine data reloaded')
        }
        
        // Clear optimistic update flag AFTER backend order is saved
        console.log('[DRAG-ORDER] 🔧 Clearing optimistic update flag AFTER backend order saved')
        setIsOptimisticUpdate(false)
        console.log('[DRAG-ORDER] ✅ Optimistic update flag cleared - day order sorting re-enabled')
        
      } catch (error) {
        console.error('[DRAG-ORDER] ❌ Failed to save day-specific order:', error)
        // Clear optimistic update flag even on error
        setIsOptimisticUpdate(false)
        // TODO: Show user-friendly error message
      }
    }
  }

  const getTasksWithDayOrder = (tasks: Task[], day: string, memberId: string): Task[] => {
    // Reduced logging to avoid console spam
    if (tasks.length > 0 && day === 'friday') {
      console.log('[DRAG-ORDER] 🔍 getTasksWithDayOrder called for Friday:', {
        day,
        memberId,
        taskCount: tasks.length,
        isOptimisticUpdate,
        isDragging,
        tasks: tasks.map(t => ({ id: t.id, name: t.name, routine_task_id: t.routine_task_id }))
      })
    }
    
    // CRITICAL FIX: Don't apply day order sorting during optimistic UI update
    // This prevents the visual glitch where tasks appear in wrong position
    if (isOptimisticUpdate) {
      console.log('[DRAG-ORDER] 🔧 Skipping day order sorting during optimistic update to prevent visual glitch')
      return tasks
    }
    
    if (!dayOrders.length) {
      return tasks
    }

    // Find day-specific orders for this member/day using bucket system
    const memberDayOrders = dayOrders.filter(order => {
      // Support both old member_id and new bucket_member_id for backward compatibility
      const orderMemberId = order.bucket_member_id || order.member_id
      return orderMemberId === memberId && order.day_of_week === day
    })

    if (!memberDayOrders.length) {
      return tasks
    }

    // Sort tasks by their day-specific order
    return tasks.sort((a, b) => {
      // Use routine_task_id if available, otherwise extract from id
      const routineTaskIdA = a.routine_task_id || extractRoutineTaskIdFromId(a.id)
      const routineTaskIdB = b.routine_task_id || extractRoutineTaskIdFromId(b.id)
      
      const orderA = memberDayOrders.find(order => order.routine_task_id === routineTaskIdA)
      const orderB = memberDayOrders.find(order => order.routine_task_id === routineTaskIdB)
      
          // Debug logging removed to reduce console clutter
      
      if (!orderA && !orderB) return 0
      if (!orderA) return 1
      if (!orderB) return -1
      
      return orderA.order_index - orderB.order_index
    })
  }

  const loadDayOrders = (dayOrders: DaySpecificOrder[]) => {
    setDayOrders(dayOrders)
  }

  return {
    // State
    draggedTask,
    dragOverPosition,
    hoveredDropZone,
    dayOrders,
    isDragging,
    isReordering,
    reorderingDay,
    
    // Setters
    setDraggedTask,
    setDragOverPosition,
    setDayOrders,
    setIsDragging,
    
    // Functions
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
