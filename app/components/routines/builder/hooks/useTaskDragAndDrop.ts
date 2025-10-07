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
  recurringTemplates: RecurringTemplate[] = [],
  reloadRoutineData?: () => Promise<void>
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
      console.log('[DRAG-ORDER] 🔍 Task details:', {
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
      
      if (!template) {
        console.warn('[DRAG-ORDER] ⚠️ Template not found for task:', task.name, 'template_id:', task.recurring_template_id)
        return
      }
      
      console.log('[DRAG-ORDER] 🔍 Found template:', {
        id: template.id,
        name: template.name,
        days_of_week: template.days_of_week,
        frequency_type: template.frequency_type
      })

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

      // Update the template days in the backend and get the new task ID mapping
      const updateResponse = await updateTemplateDays(currentRoutineId, template.id, {
        days_of_week: newDaysOfWeek
      }) as { day_to_task_id: Record<string, string> }

      console.log('[DRAG-ORDER] ✅ Template days updated successfully')
      console.log('[DRAG-ORDER] 📊 New task ID mapping:', updateResponse.day_to_task_id)
      
      return updateResponse.day_to_task_id
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
      let newTaskIdMapping: Record<string, string> | null = null
      if (sourceDay !== targetDay && task.recurring_template_id) {
        console.log('[DRAG-ORDER] 🔄 Updating template before calculating order...')
        newTaskIdMapping = await updateTaskTemplateDays(task, targetDay) || null
        console.log('[DRAG-ORDER] ✅ Template updated, reloading routine data...')
        
        // Reload routine data to get fresh task objects with correct IDs
        if (reloadRoutineData) {
          await reloadRoutineData()
          console.log('[DRAG-ORDER] 🔄 Routine data reloaded, proceeding with order calculation...')
          
          // Small delay to ensure database transaction is fully committed
          await new Promise(resolve => setTimeout(resolve, 200))
          console.log('[DRAG-ORDER] ⏱️ Delay completed after reload, proceeding...')
        }
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
        // For cross-day moves, the task is moved (not duplicated) so we need to handle positioning differently
        console.log('[DRAG-ORDER] 🔍 Cross-day move: task moved from', sourceDay, 'to', targetDay)
        console.log('[DRAG-ORDER] 🔍 Target day tasks after reload:', targetDayTasks.individualTasks.map(t => ({ 
          id: t.id, 
          name: t.name, 
          routine_task_id: t.routine_task_id,
          recurring_template_id: t.recurring_template_id
        })))
        
        // Find the moved task in the target day using multiple strategies
        console.log('[DRAG-ORDER] 🔍 Looking for moved task:', {
          originalTaskId: task.id,
          originalRoutineTaskId: task.routine_task_id,
          originalName: task.name,
          originalRecurringTemplateId: task.recurring_template_id,
          targetDayTasks: targetDayTasks.individualTasks.map(t => ({ 
            id: t.id, 
            name: t.name, 
            routine_task_id: t.routine_task_id,
            recurring_template_id: t.recurring_template_id
          }))
        })
        
        let movedTask = targetDayTasks.individualTasks.find((t: Task) => 
          t.routine_task_id === task.routine_task_id
        )
        
        // Fallback: try finding by recurring_template_id if routine_task_id match fails
        if (!movedTask) {
          console.log('[DRAG-ORDER] 🔍 Routine task ID match failed, trying recurring_template_id match')
          movedTask = targetDayTasks.individualTasks.find((t: Task) => 
            t.recurring_template_id === task.recurring_template_id
          )
        }
        
        // Fallback: try finding by name if recurring_template_id match fails
        if (!movedTask) {
          console.log('[DRAG-ORDER] 🔍 Recurring template ID match failed, trying name match')
          movedTask = targetDayTasks.individualTasks.find((t: Task) => t.name === task.name)
        }
        
        console.log('[DRAG-ORDER] 🔍 Task search result:', {
          found: !!movedTask,
          foundById: !!targetDayTasks.individualTasks.find((t: Task) => t.routine_task_id === task.routine_task_id),
          foundByName: !!targetDayTasks.individualTasks.find((t: Task) => t.name === task.name)
        })
        
        if (movedTask) {
          console.log('[DRAG-ORDER] 🔍 Found moved task:', { id: movedTask.id, name: movedTask.name, routine_task_id: movedTask.routine_task_id })
          
          // Get existing tasks for this member (excluding the moved task)
          const existingTasks = targetDayTasks.individualTasks.filter((t: Task) => {
            const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
            return taskMemberId === targetMemberId && t.id !== movedTask.id
          })
          
          // Insert the moved task at the correct position
          if (dragOverPosition?.targetTaskId) {
            const targetIndex = existingTasks.findIndex((t: Task) => t.id === dragOverPosition.targetTaskId)
            if (targetIndex !== -1) {
              const insertIndex = dragOverPosition.position === 'before' ? targetIndex : targetIndex + 1
              existingTasks.splice(insertIndex, 0, movedTask)
              console.log('[DRAG-ORDER] 🔍 Inserted moved task at index:', insertIndex, 'position:', dragOverPosition.position)
            } else {
              existingTasks.push(movedTask)
              console.log('[DRAG-ORDER] 🔍 Target task not found, appending moved task to end')
            }
          } else {
            existingTasks.push(movedTask)
            console.log('[DRAG-ORDER] 🔍 No target task specified, appending moved task to end')
          }
          
          calculatedTaskOrder = existingTasks
          
          // IMPORTANT: For cross-day moves, we need to also remove the day order entry from the source day
          console.log('[DRAG-ORDER] 🔄 Cross-day move: need to remove day order from source day:', sourceDay)
          
          // Get tasks for source day (excluding the moved task)
          const sourceDayTasks = calendarTasks[sourceDay]
          const sourceDayFilteredTasks = sourceDayTasks.individualTasks.filter((t: Task) => {
            const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
            return taskMemberId === sourceMemberId && t.id !== task.id
          })
          
          // Save the updated source day order (without the moved task)
          if (sourceDayFilteredTasks.length >= 0) {
            console.log('[DRAG-ORDER] 🔄 Saving updated source day order:', sourceDay, 'tasks:', sourceDayFilteredTasks.map(t => t.name))
            try {
              await saveDaySpecificOrder(sourceDay, sourceMemberId, sourceDayFilteredTasks)
              console.log('[DRAG-ORDER] ✅ Source day order updated successfully')
            } catch (error) {
              console.error('[DRAG-ORDER] ❌ Failed to update source day order:', error)
            }
          }
          
        } else {
          console.log('[DRAG-ORDER] ⚠️ Moved task not found after reload')
          console.log('[DRAG-ORDER] 🔍 Task 5 was moved but not loaded by reloadRoutineData')
          console.log('[DRAG-ORDER] 🔧 Creating placeholder for moved task to include in day orders')
          
          // Get existing tasks for this member
          const existingTasks = targetDayTasks.individualTasks.filter((t: Task) => {
            const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
            return taskMemberId === targetMemberId
          })
          
          // CRITICAL FIX: Use the new task ID from the template update response
          let correctRoutineTaskId = task.routine_task_id
          
          // First priority: Use the new task ID from the template update response
          if (newTaskIdMapping && newTaskIdMapping[targetDay]) {
            correctRoutineTaskId = newTaskIdMapping[targetDay]
            console.log('[DRAG-ORDER] 🎯 Using new task ID from template update:', {
              targetDay: targetDay,
              newTaskId: correctRoutineTaskId,
              originalTaskId: task.routine_task_id
            })
          } else {
            // Fallback: Try to find a task with the same recurring_template_id on the target day
            let matchingTask = targetDayTasks.individualTasks.find((t: Task) => 
              t.recurring_template_id === task.recurring_template_id
            )
            
            // Fallback: try finding by name if recurring_template_id match fails
            if (!matchingTask) {
              matchingTask = targetDayTasks.individualTasks.find((t: Task) => 
                t.name === task.name
              )
            }
            
            if (matchingTask) {
              correctRoutineTaskId = matchingTask.routine_task_id || extractRoutineTaskIdFromId(matchingTask.id)
              console.log('[DRAG-ORDER] 🔍 Found matching task for target day:', {
                name: matchingTask.name,
                id: matchingTask.id,
                routine_task_id: correctRoutineTaskId,
                originalRoutineTaskId: task.routine_task_id
              })
            } else {
              console.log('[DRAG-ORDER] ⚠️ No matching task found for target day, using original routine_task_id')
            }
          }
          
          // Create a placeholder for the moved task using the correct routine_task_id
          const movedTaskPlaceholder = {
            ...task,
            id: `${correctRoutineTaskId}_${targetDay}`,
            memberId: targetMemberId,
            routine_task_id: correctRoutineTaskId // Use the correct ID for the target day
          }
          
          console.log('[DRAG-ORDER] 🔧 Created placeholder:', {
            id: movedTaskPlaceholder.id,
            name: movedTaskPlaceholder.name,
            routine_task_id: movedTaskPlaceholder.routine_task_id,
            hasRoutineTaskId: !!movedTaskPlaceholder.routine_task_id,
            originalTaskId: task.id,
            originalRoutineTaskId: task.routine_task_id,
            correctRoutineTaskId: correctRoutineTaskId
          })
          
          // Insert the placeholder at the correct position
          if (dragOverPosition?.targetTaskId) {
            const targetIndex = existingTasks.findIndex((t: Task) => t.id === dragOverPosition.targetTaskId)
            if (targetIndex !== -1) {
              const insertIndex = dragOverPosition.position === 'before' ? targetIndex : targetIndex + 1
              existingTasks.splice(insertIndex, 0, movedTaskPlaceholder)
              console.log('[DRAG-ORDER] 🔧 Inserted placeholder at index:', insertIndex, 'position:', dragOverPosition.position)
            } else {
              existingTasks.push(movedTaskPlaceholder)
              console.log('[DRAG-ORDER] 🔧 Appended placeholder to end (target not found)')
            }
          } else {
            existingTasks.push(movedTaskPlaceholder)
            console.log('[DRAG-ORDER] 🔧 Appended placeholder to end (no target specified)')
          }
          
          calculatedTaskOrder = existingTasks
          console.log('[DRAG-ORDER] 🔍 Final order with placeholder:', calculatedTaskOrder.map((t, idx) => ({ 
            index: idx,
            id: t.id, 
            name: t.name, 
            routine_task_id: t.routine_task_id,
            memberId: t.memberId
          })))
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
      // Cross-day moves: Don't update UI state since reloadRoutineData already handled it
      console.log('[DRAG-ORDER] 🔄 Cross-day move: skipping UI state update (reloadRoutineData already handled it)')
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
