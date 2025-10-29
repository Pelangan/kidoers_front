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


    // Calculate the new order
    const sourceDayTasks = calendarTasks[sourceDay]
    const targetDayTasks = calendarTasks[targetDay]
    let calculatedTaskOrder: Task[] = []
    // Extract routine task ID at function level so it's accessible in all branches
    const routineTaskIdToMove = task.routine_task_id || extractRoutineTaskIdFromId(task.id)
    
    if (sourceDay === targetDay && sourceMemberId === targetMemberId) {
      // Same day reordering
      const memberTasks = sourceDayTasks.individualTasks.filter((t: Task) => {
        const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
        return taskMemberId === sourceMemberId
      })
      
      const filteredTasks = memberTasks.filter((t: Task) => t.id !== task.id)
      
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
      // Cross-day or cross-member reordering
      // Clear assignees for single-member move - this ensures the task only appears in target member's bucket
      const updatedTask = { 
        ...task, 
        memberId: targetMemberId,
        assignees: undefined // Clear assignees since we're doing a single-member assignment
      }
      let newTargetTasks = [...targetDayTasks.individualTasks]
      
      // Remove any existing task with the same routine_task_id (to avoid duplicates in same-day cross-member moves)
      const tasksBeforeFilter = newTargetTasks.length
      newTargetTasks = newTargetTasks.filter((t: Task) => {
        const tRoutineTaskId = t.routine_task_id || extractRoutineTaskIdFromId(t.id)
        return tRoutineTaskId !== routineTaskIdToMove
      })
      const tasksAfterFilter = newTargetTasks.length
      
      if (tasksBeforeFilter > tasksAfterFilter) {
        console.log('[DND-KIT] 🗑️ Removed existing duplicate task from target, filtered count:', tasksBeforeFilter, '->', tasksAfterFilter)
      }
      
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
      
      // Filter to get tasks for target member, matching by routine_task_id for the moved task
      calculatedTaskOrder = newTargetTasks.filter((t: Task) => {
        const tRoutineTaskId = t.routine_task_id || extractRoutineTaskIdFromId(t.id)
        const isMovedTask = tRoutineTaskId === routineTaskIdToMove
        const taskMemberId = isMovedTask ? targetMemberId : (t.memberId || extractRoutineTaskIdFromId(t.id))
        return taskMemberId === targetMemberId
      })
      
      // Ensure all tasks in calculatedTaskOrder have the correct memberId, especially the moved task
      calculatedTaskOrder = calculatedTaskOrder.map((t: Task) => {
        const tRoutineTaskId = t.routine_task_id || extractRoutineTaskIdFromId(t.id)
        if (tRoutineTaskId === routineTaskIdToMove) {
          // Clear assignees array and set memberId for single-member assignment
          // This ensures the task only appears in the target member's bucket
          return { 
            ...t, 
            memberId: targetMemberId,
            assignees: undefined // Clear assignees since we're doing a single-member move
          }
        }
        return t
      })
    }

    // Update UI state
    if (sourceDay === targetDay && sourceMemberId === targetMemberId) {
      // Same day, same member - simple reordering
      updateCalendarTasks(prev => {
        const newCalendarTasks = { ...prev }
        newCalendarTasks[sourceDay] = {
          ...newCalendarTasks[sourceDay],
          individualTasks: calculatedTaskOrder
        }
        return newCalendarTasks
      })
    } else {
      // Cross-day or cross-member moves
      updateCalendarTasks(prev => {
        const newCalendarTasks = { ...prev }
        
        // Debug: Log before filtering
        const tasksBeforeFilter = newCalendarTasks[sourceDay].individualTasks
        console.log('[DND-KIT] 🔍 Before filtering - Source day tasks:', {
          totalTasks: tasksBeforeFilter.length,
          tasksByMember: tasksBeforeFilter.reduce((acc: Record<string, number>, t: Task) => {
            const memberId = t.memberId || extractRoutineTaskIdFromId(t.id)
            acc[memberId] = (acc[memberId] || 0) + 1
            return acc
          }, {} as Record<string, number>),
          taskToRemove: {
            id: task.id,
            routine_task_id: task.routine_task_id,
            memberId: task.memberId || extractRoutineTaskIdFromId(task.id)
          }
        })
        
        // Remove from source day/member
        const sourceTasksBefore = newCalendarTasks[sourceDay].individualTasks.length
        
        // Create a fresh array to avoid reference issues
        const filteredSourceTasks = newCalendarTasks[sourceDay].individualTasks.filter((t: Task) => {
          // Check both memberId and assignees for matching
          const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
          const taskAssignees = t.assignees?.map((a: any) => a.id) || []
          const isAssignedToSourceMember = taskMemberId === sourceMemberId || taskAssignees.includes(sourceMemberId)
          
          // Use routine_task_id for matching since calendar tasks have day suffixes in their IDs
          const matchingByRoutineTaskId = task.routine_task_id && t.routine_task_id && t.routine_task_id === task.routine_task_id
          const matchingByBaseId = !task.routine_task_id && t.id.startsWith(task.id)
          const taskMatches = isAssignedToSourceMember && (matchingByRoutineTaskId || matchingByBaseId)
          
          if (taskMatches) {
            console.log('[DND-KIT] ✅ REMOVING task from source:', t.name, 'memberId:', taskMemberId)
          }
          
          // Debug log all tasks being checked
          console.log('[DND-KIT] 🔍 Checking task:', {
            taskId: t.id,
            taskName: t.name,
            taskMemberId,
            taskMemberIdFromProp: t.memberId,
            taskRoutineTaskId: t.routine_task_id,
            sourceMemberId,
            matchingByRoutineTaskId,
            matchingByBaseId: matchingByBaseId,
            taskMatches,
            dragTaskId: task.id,
            dragTaskRoutineTaskId: task.routine_task_id,
            dragTaskMemberId: task.memberId,
            comparison: {
              task_routineId: t.routine_task_id,
              drag_routineId: task.routine_task_id,
              routineIdMatch: t.routine_task_id === task.routine_task_id,
              task_idStartsWith: t.id.startsWith(task.id),
              task_idFull: t.id,
              drag_idFull: task.id
            }
          })
          
          return !taskMatches
        })
        
        const sourceTasksAfter = filteredSourceTasks.length
        console.log('[DND-KIT] 📊 Source tasks after filtering:', sourceTasksBefore, '->', sourceTasksAfter)
        
        // Update source day with filtered tasks
        newCalendarTasks[sourceDay] = {
          ...newCalendarTasks[sourceDay],
          individualTasks: filteredSourceTasks
        }
        
        // If same-day cross-member, source and target are the same day, so we need to combine them
        if (sourceDay === targetDay && sourceMemberId !== targetMemberId) {
          console.log('[DND-KIT] 🔄 Same-day cross-member move - combining source and target tasks')
          
          // Use the already-filtered source tasks (which have the removed task taken out)
          // Only keep tasks that are NOT for the target member
          const tasksFromOtherMembers = filteredSourceTasks.filter((t: Task) => {
            const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
            return taskMemberId !== targetMemberId // Exclude tasks for target member (they'll be replaced by calculatedTaskOrder)
          })
          
          // Ensure all tasks in calculatedTaskOrder have explicit memberId set
          const calculatedTaskOrderWithMemberIds = calculatedTaskOrder.map((t: Task) => {
            const tRoutineTaskId = t.routine_task_id || extractRoutineTaskIdFromId(t.id)
            const isMovedTask = tRoutineTaskId === routineTaskIdToMove
            if (isMovedTask) {
              // Ensure moved task has correct memberId and cleared assignees
              return { 
                ...t, 
                memberId: targetMemberId,
                assignees: undefined // Clear assignees for single-member move
              }
            }
            // Ensure all other tasks have explicit memberId
            return { ...t, memberId: t.memberId || extractRoutineTaskIdFromId(t.id) }
          })
          
          // Combine: other members' tasks + newly placed target tasks
          calculatedTaskOrder = [
            ...tasksFromOtherMembers,
            ...calculatedTaskOrderWithMemberIds // Add the newly placed tasks for target member
          ]
          
          console.log('[DND-KIT] 📊 After merge:', {
            tasksFromOtherMembers: tasksFromOtherMembers.length,
            calculatedTaskOrderLength: calculatedTaskOrder.length,
            breakdown: calculatedTaskOrder.map((t: Task) => ({
              name: t.name,
              memberId: t.memberId,
              routine_task_id: t.routine_task_id,
              id: t.id
            }))
          })
        }
        
        console.log('[DND-KIT] 📊 Calculated task order:', {
          length: calculatedTaskOrder.length,
          tasks: calculatedTaskOrder.map((t: Task) => ({
            name: t.name,
            id: t.id,
            memberId: t.memberId,
            assignees: t.assignees?.map((a: any) => a.id),
            routine_task_id: t.routine_task_id
          }))
        })
        
        // Add to target day/member
        newCalendarTasks[targetDay] = {
          ...newCalendarTasks[targetDay],
          individualTasks: calculatedTaskOrder
        }
        
        console.log('[DND-KIT] ✅ UI updated:', {
          sourceDay,
          targetDay,
          sourceMemberId,
          targetMemberId,
          sourceTasks: newCalendarTasks[sourceDay].individualTasks.length,
          targetTasks: newCalendarTasks[targetDay].individualTasks.length,
          sourceTasksByMember: newCalendarTasks[sourceDay].individualTasks.reduce((acc: Record<string, number>, t: Task) => {
            const mId = t.memberId || 'unknown'
            acc[mId] = (acc[mId] || 0) + 1
            return acc
          }, {}),
          targetTasksByMember: newCalendarTasks[targetDay].individualTasks.reduce((acc: Record<string, number>, t: Task) => {
            const mId = t.memberId || 'unknown'
            acc[mId] = (acc[mId] || 0) + 1
            return acc
          }, {}),
          targetTaskDetails: newCalendarTasks[targetDay].individualTasks.map((t: Task) => ({
            name: t.name,
            memberId: t.memberId,
            assignees: t.assignees?.map((a: any) => a.id),
            id: t.id,
            routine_task_id: t.routine_task_id
          }))
        })
        
        return newCalendarTasks
      })
    }

    // Save the new order to backend
    if (calculatedTaskOrder.length > 0) {
      try {
        // If it's a cross-day move, update the task's day assignment
        if (sourceDay !== targetDay) {
          // For recurring tasks, add the target day to the existing pattern instead of replacing
          if (task.recurring_template_id) {
            const template = recurringTemplates.find(t => t.id === task.recurring_template_id)
            const currentDays = template?.days_of_week || []
            const updatedDays = currentDays.includes(targetDay)
              ? currentDays
              : [...currentDays, targetDay]
            
            const { updateTemplateDays } = await import('../../../../lib/api')
            await updateTemplateDays(currentRoutineId, task.recurring_template_id, {
              days_of_week: updatedDays
            })
          } else {
            const { patchRoutineTask } = await import('../../../../lib/api')
            await patchRoutineTask(currentRoutineId, task.routine_task_id || extractRoutineTaskIdFromId(task.id), {
              days_of_week: [targetDay]
            })
          }
        }
        
        // If it's a member transfer, update the task's member assignment
        if (sourceMemberId !== targetMemberId) {
          try {
            const { createTaskAssignment, getRoutineAssignments, deleteTaskAssignment } = await import('../../../../lib/api')
            const assignments = await getRoutineAssignments(currentRoutineId)
            const routineTaskId = task.routine_task_id || extractRoutineTaskIdFromId(task.id)
            
            const currentAssignment = assignments.find(a => 
              a.routine_task_id === routineTaskId && 
              a.member_id === sourceMemberId
            )
            
            if (currentAssignment) {
              const isSameDay = sourceDay === targetDay
              const isRecurring = !!task.recurring_template_id
              
              await deleteTaskAssignment(currentRoutineId, routineTaskId, currentAssignment.id)
              await createTaskAssignment(currentRoutineId, routineTaskId, targetMemberId, 0)
              
              // For same-day cross-member moves, ensure UI is updated even if we skip reload
              if (isSameDay && reloadRoutineData) {
                // For same-day moves, we've already updated UI optimistically, but reload to ensure consistency
                // Only skip reload for recurring tasks to prevent showing task on all template days
                if (!isRecurring) {
                  await reloadRoutineData()
                } else {
                  // For recurring same-day moves, just force a UI update to ensure memberId is correct
                  updateCalendarTasks(prev => {
                    const updated = { ...prev }
                    if (updated[targetDay]) {
                      updated[targetDay] = {
                        ...updated[targetDay],
                        individualTasks: updated[targetDay].individualTasks.map((t: Task) => {
                          const tRoutineTaskId = t.routine_task_id || extractRoutineTaskIdFromId(t.id)
                          if (tRoutineTaskId === routineTaskId) {
                            return { 
                              ...t, 
                              memberId: targetMemberId,
                              assignees: undefined // Clear assignees for single-member assignment
                            }
                          }
                          return t
                        })
                      }
                    }
                    return updated
                  })
                }
              } else if (reloadRoutineData) {
                await reloadRoutineData()
              }
            }
          } catch (error) {
            console.error('[DND-KIT] ❌ Failed to update member assignment:', error)
          }
        }
        
        await saveDaySpecificOrder(targetDay, targetMemberId, calculatedTaskOrder)
      } catch (error) {
        console.error('[DND-KIT] ❌ Failed to save day-specific order:', error)
      }
    }
  }, [currentRoutineId, calendarTasks, extractRoutineTaskIdFromId, updateCalendarTasks, saveDaySpecificOrder, reloadRoutineData, recurringTemplates])

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    
    // Clear drag state
    setDraggedTask(null)
    setDragOverPosition(null)
    setHoveredDropZone(null)
    setIsDragging(false)
    
    if (!over) {
      return
    }
    
    const activeData = active.data.current
    const overData = over.data.current
    
    if (!activeData || !overData) {
      return
    }
    
    const { task: draggedTaskData, day: sourceDay, memberId: sourceMemberId, isCopyOperation } = activeData
    const { day: targetDay, memberId: targetMemberId, position, targetTaskId } = overData
    
    console.log('[DND-KIT] 🎯 Drop:', {
      taskName: draggedTaskData.name,
      source: `${sourceDay}/${sourceMemberId}`,
      target: `${targetDay}/${targetMemberId}`
    })
    
    // Create drag over position for the move operation
    const dragOverPosition: DragOverPosition = {
      day: targetDay,
      memberId: targetMemberId,
      position,
      targetTaskId
    }
    
    // Implement actual drop logic using the existing moveTaskToPosition function
    try {
      setIsReordering(true)
      setReorderingDay(targetDay)
      setSourceDay(sourceDay)
      
      await moveTaskToPosition(draggedTaskData, sourceDay, sourceMemberId, targetDay, targetMemberId, dragOverPosition)
      
      setIsReordering(false)
      setReorderingDay(null)
      setSourceDay(null)
      
      toast({
        title: "Task moved",
        description: `Moved ${draggedTaskData.name} to ${targetDay}`,
      })
    } catch (error) {
      console.error('[DND-KIT] ❌ Error during task drop:', error)
      
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
