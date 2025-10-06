import { useState, useEffect } from 'react'
import { bulkUpdateDayOrders, updateTemplateDays } from '../../../../lib/api'
import type { Task, DaySpecificOrder, RecurringTemplate } from '../types/routineBuilderTypes'

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
  updateCalendarTasks: (updater: (prev: any) => any) => void,
  extractRoutineTaskIdFromId: (id: string) => string,
  currentRoutineId: string | null,
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
    }
    
    setDragOverPosition(newDragOverPosition)
  }

  const handleTaskDragLeave = () => {
    setDragOverPosition(null)
  }

  const handleTaskDrop = async (e: React.DragEvent, targetDay: string, targetMemberId: string) => {
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

    console.log('[DRAG-ORDER] 🔄 Moving task:', task.name, 'from', sourceDay, 'to', targetDay)
    console.log('[DRAG-ORDER] 🎯 Drag over position:', dragOverPosition)

    // If moving to a different day, update the recurring template's days_of_week
    if (sourceDay !== targetDay && task.recurring_template_id) {
      await updateTaskTemplateDays(task, targetDay)
    }

    let finalTaskOrder: Task[] = []

    updateCalendarTasks(prev => {
      const newCalendarTasks = { ...prev }
      
      // Remove task from source day
      if (sourceDay === targetDay && sourceMemberId === targetMemberId) {
        // Same day reordering - remove and reinsert
        const sourceDayTasks = newCalendarTasks[sourceDay]
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
        
        newCalendarTasks[sourceDay] = {
          ...sourceDayTasks,
          individualTasks: filteredTasks
        }
        
        finalTaskOrder = filteredTasks.filter((t: Task) => {
          const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
          return taskMemberId === targetMemberId
        })
      } else {
        // Different day reordering - remove from source, add to target
        const sourceDayTasks = newCalendarTasks[sourceDay]
        const targetDayTasks = newCalendarTasks[targetDay]
        
        // Remove from source
        newCalendarTasks[sourceDay] = {
          ...sourceDayTasks,
          individualTasks: sourceDayTasks.individualTasks.filter((t: Task) => {
            const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
            return !(t.id === task.id && taskMemberId === sourceMemberId)
          })
        }
        
        // Add to target
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
        
        newCalendarTasks[targetDay] = {
          ...targetDayTasks,
          individualTasks: newTargetTasks
        }
        
        finalTaskOrder = newTargetTasks.filter((t: Task) => {
          const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
          return taskMemberId === targetMemberId
        })
      }
      
      return newCalendarTasks
    })

    // Save the new order to backend
    if (finalTaskOrder.length > 0) {
      try {
        console.log('[DRAG-ORDER] 💾 Saving new order to backend for day:', targetDay)
        
        // Create day order entries for all tasks in the target day
        const dayOrdersToSave: DaySpecificOrder[] = finalTaskOrder.map((t: Task, index: number) => ({
          id: `temp-${Date.now()}-${Math.random()}`,
          routine_id: currentRoutineId!,
          routine_task_id: extractRoutineTaskIdFromId(t.id),
          member_id: targetMemberId,
          day_of_week: targetDay,
          order_index: index,
          created_at: new Date().toISOString()
        }))

        console.log('[DRAG-ORDER] 📋 Day orders to save:', dayOrdersToSave.map(o => ({ taskId: o.routine_task_id, order: o.order_index })))

        await bulkUpdateDayOrders(currentRoutineId, {
          member_id: targetMemberId,
          day_of_week: targetDay,
          task_orders: dayOrdersToSave.map(order => ({
            routine_task_id: order.routine_task_id,
            order_index: order.order_index
          }))
        })

        // Update local state to reflect the saved orders
        setDayOrders(prev => {
          const newDayOrders = [...prev]
          
          // Remove existing orders for this member/day
          const filteredOrders = newDayOrders.filter(order => 
            !(order.member_id === targetMemberId && order.day_of_week === targetDay)
          )
          
          // Add the new orders
          filteredOrders.push(...dayOrdersToSave);
          
          console.log('[DRAG-ORDER] 📊 Updated local day orders for', targetDay, ':', dayOrdersToSave.map(o => ({ taskId: o.routine_task_id, order: o.order_index })))
          
          return filteredOrders
        })

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
      const orderA = memberDayOrders.find(order => order.routine_task_id === extractRoutineTaskIdFromId(a.id))
      const orderB = memberDayOrders.find(order => order.routine_task_id === extractRoutineTaskIdFromId(b.id))
      
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
