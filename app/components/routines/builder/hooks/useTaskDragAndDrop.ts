import { useState, useEffect } from 'react'
import { bulkUpdateDayOrders, updateTemplateDays } from '../../../../lib/api'
import type { Task, DaySpecificOrder, RecurringTemplate } from '../types/routineBuilderTypes'

interface CalendarTasks {
  groups: any[]
  individualTasks: Task[]
}

interface DraggedTask {
  task: Task
  day: string
  memberId: string
}

interface DragOverPosition {
  day: string
  memberId: string
  position: 'before' | 'after'
  targetTaskId?: string
}

export const useTaskDragAndDrop = (
  calendarTasks: Record<string, CalendarTasks>,
  updateCalendarTasks: (updater: (prev: any) => any) => void,
  extractRoutineTaskIdFromId: (id: string) => string,
  currentRoutineId: string | null,
  saveDaySpecificOrder: (day: string, memberId: string, tasks: Task[]) => Promise<void>,
  recurringTemplates: RecurringTemplate[] = []
) => {
  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState<DraggedTask | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<DragOverPosition | null>(null)
  const [dayOrders, setDayOrders] = useState<DaySpecificOrder[]>([])
  const [isDragging, setIsDragging] = useState(false)

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
    console.log('[DRAG-ORDER] 🚀 DRAG START EVENT TRIGGERED!', { task: task.name, day, memberId })
    console.log('[DRAG-ORDER] 🔧 DEBUG: handleTaskDragStart called with:', { task, day, memberId })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', '') // Required for Firefox
    
    // Store the dragged task info
    console.log('[DRAG-ORDER] 📝 Storing dragged task:', { task: task.name, day, memberId })
    
    setDraggedTask({ task, day, memberId })
    setIsDragging(true)
    console.log('[DRAG-ORDER] ✅ Started dragging task:', task.name, 'from day:', day, 'member:', memberId)
    console.log('[CURSOR-DEBUG] Set isDragging to true')
  }

  const handleTaskDragOver = (e: React.DragEvent, day: string, memberId: string, position: 'before' | 'after', targetTaskId?: string) => {
    if (!draggedTask) return
    
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
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
  }

  const handleTaskDrop = async (e: React.DragEvent, targetDay: string, targetMemberId: string) => {
    console.log('[DRAG-ORDER] 🎯 DROP EVENT TRIGGERED!', { targetDay, targetMemberId, draggedTask: draggedTask?.task.name })
    
    if (!draggedTask) {
      console.log('[DRAG-ORDER] ❌ No dragged task on drop')
      return
    }
    
    e.preventDefault()
    
    const { task, day: sourceDay, memberId: sourceMemberId } = draggedTask
    
    console.log('[DRAG-ORDER] 🎯 DROP EVENT:', {
      sourceDay,
      sourceMemberId,
      targetDay,
      targetMemberId,
      dragOverPosition
    })

    // Don't reorder if dropped in the same position AND no drag over position is specified
    if (sourceDay === targetDay && sourceMemberId === targetMemberId && (!dragOverPosition || !dragOverPosition.targetTaskId)) {
      console.log('[DRAG-ORDER] ⚠️ Dropped in same position with no specific target, no reorder needed')
      setDraggedTask(null)
      setDragOverPosition(null)
      return
    }

    // Move the task to the new position
    console.log('[DRAG-ORDER] ✅ Proceeding with reorder - dragOverPosition:', dragOverPosition)
    await moveTaskToPosition(task, sourceDay, sourceMemberId, targetDay, targetMemberId, dragOverPosition)
    
    setDraggedTask(null)
    setDragOverPosition(null)
  }

  const handleTaskDragEnd = () => {
    setDraggedTask(null)
    setDragOverPosition(null)
    setIsDragging(false)
  }

  const updateTaskTemplateDays = async (task: Task, targetDay: string) => {
    if (!currentRoutineId || !task.recurring_template_id) {
      return
    }

    try {
      console.log('[DRAG-ORDER] 📅 Updating template days for task:', task.name)
      
      // Find the recurring template for this task
      const template = recurringTemplates.find(t => t.id === task.recurring_template_id)
      
      if (!template) {
        console.warn('[DRAG-ORDER] ⚠️ Template not found for task:', task.name)
        return
      }

      console.log('[DRAG-ORDER] 📋 Current template days:', template.days_of_week)
      console.log('[DRAG-ORDER] 🎯 Target day:', targetDay)

      // Determine new days_of_week based on frequency_type
      let newDaysOfWeek: string[] = []

      if (template.frequency_type === 'just_this_day') {
        // For single-day tasks, replace with the new day
        newDaysOfWeek = [targetDay]
        console.log('[DRAG-ORDER] ✏️ Single-day task: replacing with', targetDay)
      } else if (template.frequency_type === 'specific_days') {
        const currentDays = template.days_of_week || []
        
        // If it's a single-day specific_days task being moved, REPLACE the day (don't add)
        if (currentDays.length === 1) {
          newDaysOfWeek = [targetDay]
          console.log('[DRAG-ORDER] ✏️ Single-day specific task: replacing', currentDays[0], 'with', targetDay)
        } 
        // If it's a multi-day task, ADD the new day if not already present
        else if (!currentDays.includes(targetDay)) {
          newDaysOfWeek = [...currentDays, targetDay].sort()
          console.log('[DRAG-ORDER] ➕ Multi-day task: adding', targetDay, 'to existing days')
        } else {
          // Already includes this day, no update needed
          console.log('[DRAG-ORDER] ✅ Task already includes', targetDay)
          return
        }
      } else if (template.frequency_type === 'every_day') {
        // Every day tasks already have all days, no update needed
        console.log('[DRAG-ORDER] ℹ️ Every-day task: no update needed')
        return
      }

      console.log('[DRAG-ORDER] 💾 Updating template with new days:', newDaysOfWeek)

      // Update the template days in the backend
      await updateTemplateDays(currentRoutineId, template.id, {
        days_of_week: newDaysOfWeek
      })

      console.log('[DRAG-ORDER] ✅ Template days updated successfully')
    } catch (error) {
      console.error('[DRAG-ORDER] ❌ Failed to update template days:', error)
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

    // If moving to a different day, update the recurring template's days_of_week
    if (sourceDay !== targetDay && task.recurring_template_id) {
      await updateTaskTemplateDays(task, targetDay)
    }

    // Calculate the new order BEFORE updating state
    const sourceDayTasks = calendarTasks[sourceDay]
    const targetDayTasks = calendarTasks[targetDay]
    let calculatedTaskOrder: Task[] = []
    
    if (sourceDay === targetDay && sourceMemberId === targetMemberId) {
      // Same day reordering
      const filteredTasks = sourceDayTasks.individualTasks.filter((t: Task) => {
        const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
        return !(t.id === task.id && taskMemberId === sourceMemberId)
      })
      
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
      
      console.log('[DRAG-ORDER] 🔍 Cross-day reorder - NEW order for', targetDay, ':', calculatedTaskOrder.map((t: Task) => ({ 
        id: t.id, 
        name: t.name, 
        memberId: t.memberId 
      })))
    }
    
    console.log('[DRAG-ORDER] 📊 Calculated task order, length:', calculatedTaskOrder.length)
    console.log('[DRAG-ORDER] 📊 Calculated task order contents:', calculatedTaskOrder.map((t: Task) => ({ id: t.id, name: t.name })))
    
    // Now update state
    updateCalendarTasks(prev => {
      const newCalendarTasks = { ...prev }
      const sourceTasks = newCalendarTasks[sourceDay]
      const targetTasks = newCalendarTasks[targetDay]
      
      if (sourceDay === targetDay && sourceMemberId === targetMemberId) {
        // Same day - update with calculated order
        newCalendarTasks[sourceDay] = {
          ...sourceTasks,
          individualTasks: calculatedTaskOrder
        }
      } else {
        // Cross-day - remove from source and add to target
        newCalendarTasks[sourceDay] = {
          ...sourceTasks,
          individualTasks: sourceTasks.individualTasks.filter((t: Task) => {
            const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
            return !(t.id === task.id && taskMemberId === sourceMemberId)
          })
        }
        
        const updatedTask = { ...task, memberId: targetMemberId }
        let newTargetTasks = [...targetTasks.individualTasks]
        
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
        
        newCalendarTasks[targetDay] = {
          ...targetTasks,
          individualTasks: newTargetTasks
        }
      }
      
      return newCalendarTasks
    })

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
      } catch (error) {
        console.error('[DRAG-ORDER] ❌ Failed to save day-specific order:', error)
        // TODO: Show user-friendly error message
      }
    }
  }

  const getTasksWithDayOrder = (tasks: Task[], day: string, memberId: string): Task[] => {
    if (!dayOrders.length) {
      return tasks
    }

    // Find day-specific orders for this member/day
    const memberDayOrders = dayOrders.filter(order => 
      order.member_id === memberId && order.day_of_week === day
    )

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
      
      console.log('[DRAG-ORDER] 🔍 getTasksWithDayOrder sorting:', {
        taskA: { id: a.id, routine_task_id: a.routine_task_id, finalId: routineTaskIdA, order: orderA?.order_index },
        taskB: { id: b.id, routine_task_id: b.routine_task_id, finalId: routineTaskIdB, order: orderB?.order_index },
        dayOrders: memberDayOrders.map(o => ({ routine_task_id: o.routine_task_id, order_index: o.order_index }))
      })
      
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
    dayOrders,
    isDragging,
    
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
