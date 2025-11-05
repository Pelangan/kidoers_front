import { useState, useCallback, useRef } from 'react'
import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { useToast } from '../../../../hooks/use-toast'
import { useSaving } from '../ui/SavingContext'
import { ToastAction } from '../../../../../components/ui/toast'
import React from 'react'
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
  onOpenEditModal?: (task: Task) => void,
  setRecurringTemplates?: (updater: (prev: RecurringTemplate[]) => RecurringTemplate[]) => void,
  getMemberNameById?: (id: string) => string
) => {
  const { toast } = useToast()
  const { begin, isPending } = useSaving()
  // Track pending tasks and rollback state
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set())
  const rollbackStateRef = useRef<Record<string, CalendarTasks> | null>(null)
  const debounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  
  // Helper to get operation key for a task
  const getOpKey = useCallback((task: Task) => {
    const routineTaskId = task.routine_task_id || extractRoutineTaskIdFromId(task.id)
    return `task-move-${routineTaskId}`
  }, [extractRoutineTaskIdFromId])
  
  // Helper to check if a task is pending
  const isTaskPending = useCallback((task: Task) => {
    const opKey = getOpKey(task)
    return isPending(opKey) || pendingTaskIds.has(task.id)
  }, [isPending, getOpKey, pendingTaskIds])
  
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
      // IMPORTANT: Get ALL tasks for this member/day, including tasks from groups
      // This ensures we can reorder across different routine groups
      const allTasksForDay = [
        ...(sourceDayTasks.individualTasks || []),
        ...(sourceDayTasks.groups?.flatMap((g: any) => g.tasks || []) || [])
      ]
      
      const memberTasks = allTasksForDay.filter((t: Task) => {
        const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
        return taskMemberId === sourceMemberId
      })
      
      // Filter out the task being dragged using routine_task_id for reliable matching
      const filteredTasks = memberTasks.filter((t: Task) => {
        const tRoutineTaskId = t.routine_task_id || extractRoutineTaskIdFromId(t.id)
        const dragRoutineTaskId = routineTaskIdToMove
        // Also check by ID as fallback for tasks without routine_task_id
        return tRoutineTaskId !== dragRoutineTaskId && t.id !== task.id
      })
      
      console.log('[DND-KIT] 🔄 Same-day reordering:', {
        allTasksForDayCount: allTasksForDay.length,
        memberTasksCount: memberTasks.length,
        filteredTasksCount: filteredTasks.length,
        dragTaskId: task.id,
        dragTaskName: task.name,
        dragRoutineTaskId: routineTaskIdToMove,
        targetTaskId: dragOverPosition?.targetTaskId,
        position: dragOverPosition?.position,
        memberTasks: memberTasks.map((t: Task) => ({
          id: t.id,
          name: t.name,
          routine_task_id: t.routine_task_id,
          group_id: t.group_id
        }))
      })
      
      if (dragOverPosition?.targetTaskId) {
        const targetTaskId = dragOverPosition.targetTaskId
        // Find target task by ID or routine_task_id
        // Try multiple matching strategies to handle different ID formats
        let targetIndex = filteredTasks.findIndex((t: Task) => {
          // Strategy 1: Exact ID match
          if (t.id === targetTaskId) return true
          // Strategy 2: Check if IDs match after removing day suffixes
          const tBaseId = t.id.split('_').slice(0, -1).join('_') || t.id
          const targetBaseId = targetTaskId.split('_').slice(0, -1).join('_') || targetTaskId
          if (tBaseId && targetBaseId && tBaseId === targetBaseId && tBaseId !== t.id) return true
          // Strategy 3: routine_task_id match
          const tRoutineTaskId = t.routine_task_id || extractRoutineTaskIdFromId(t.id)
          const targetRoutineTaskId = extractRoutineTaskIdFromId(targetTaskId)
          if (tRoutineTaskId && targetRoutineTaskId && tRoutineTaskId === targetRoutineTaskId) return true
          // Strategy 4: Check if targetTaskId starts with task ID (for day-suffixed IDs)
          if (t.id.startsWith(targetTaskId) || targetTaskId.startsWith(t.id)) return true
          return false
        })
        
        console.log('[DND-KIT] 🎯 Target search:', {
          targetTaskId: targetTaskId,
          targetIndex,
          filteredTasksIds: filteredTasks.map((t: Task) => ({
            id: t.id,
            routine_task_id: t.routine_task_id,
            name: t.name
          })),
          position: dragOverPosition.position
        })
        
        if (targetIndex !== -1) {
          const insertIndex = dragOverPosition.position === 'before' ? targetIndex : targetIndex + 1
          filteredTasks.splice(insertIndex, 0, task)
          console.log('[DND-KIT] ✅ Inserted task at index:', insertIndex, 'Total tasks:', filteredTasks.length, 'Task name:', task.name)
        } else {
          // If target not found, append to end
          filteredTasks.push(task)
          console.log('[DND-KIT] ⚠️ Target not found, appended to end. Target ID was:', dragOverPosition.targetTaskId)
        }
      } else {
        // No target specified, append to end
        filteredTasks.push(task)
        console.log('[DND-KIT] ⚠️ No target specified, appended to end')
      }
      
      // Deduplicate tasks by routine_task_id to prevent duplicates in the order
      // Since backend scopes by (routine_id, group_id, day_of_week, bucket_type, member_id),
      // we need to ensure each task appears only once
      const uniqueTasks = new Map<string, Task>()
      filteredTasks.forEach((t: Task) => {
        const routineTaskId = t.routine_task_id || extractRoutineTaskIdFromId(t.id)
        // Use routine_task_id as the key (backend will handle group_id scoping)
        if (!uniqueTasks.has(routineTaskId)) {
          uniqueTasks.set(routineTaskId, t)
        } else {
          console.warn('[DND-KIT] ⚠️ Duplicate task in calculated order:', {
            routine_task_id: routineTaskId,
            task_name: t.name,
            existing_task: uniqueTasks.get(routineTaskId)?.name
          })
        }
      })
      
      // Convert back to array preserving order
      calculatedTaskOrder = Array.from(uniqueTasks.values())
      
      console.log('[DND-KIT] 📊 Final task order (deduplicated):', {
        originalCount: filteredTasks.length,
        uniqueCount: calculatedTaskOrder.length,
        tasks: calculatedTaskOrder.map((t: Task) => ({
          name: t.name,
          routine_task_id: t.routine_task_id || extractRoutineTaskIdFromId(t.id),
          group_id: t.group_id
        }))
      })
    } else {
      // Cross-day or cross-member reordering
      // Clear assignees for single-member move - this ensures the task only appears in target member's bucket
      // Update task ID to match the target day format (remove source day suffix if present)
      const baseTaskId = task.routine_task_id || task.id.split('_')[0] // Get base ID without day suffix
      const updatedTaskId = sourceDay !== targetDay 
        ? `${baseTaskId}_${targetDay}` // Update ID to include target day
        : task.id // Keep same ID for same-day moves
      const updatedTask = { 
        ...task, 
        id: updatedTaskId,
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
      
      // Ensure all tasks in calculatedTaskOrder have the correct memberId and ID, especially the moved task
      calculatedTaskOrder = calculatedTaskOrder.map((t: Task) => {
        const tRoutineTaskId = t.routine_task_id || extractRoutineTaskIdFromId(t.id)
        if (tRoutineTaskId === routineTaskIdToMove) {
          // Update task ID to match target day format and clear assignees
          const baseTaskId = t.routine_task_id || t.id.split('_')[0]
          const newTaskId = sourceDay !== targetDay 
            ? `${baseTaskId}_${targetDay}` // Update ID to include target day
            : t.id // Keep same ID for same-day moves
          
          return { 
            ...t, 
            id: newTaskId,
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
        // Remove the task from source day by matching routine_task_id (most reliable)
        const filteredSourceTasks = newCalendarTasks[sourceDay].individualTasks.filter((t: Task) => {
          // Check both memberId and assignees for matching
          const taskMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
          const taskAssignees = t.assignees?.map((a: any) => a.id) || []
          const isAssignedToSourceMember = taskMemberId === sourceMemberId || taskAssignees.includes(sourceMemberId)
          
          // If not assigned to source member, keep the task
          if (!isAssignedToSourceMember) {
            return true
          }
          
          // Extract routine_task_id from both tasks for comparison
          const tRoutineTaskId = t.routine_task_id || extractRoutineTaskIdFromId(t.id)
          const dragRoutineTaskId = task.routine_task_id || extractRoutineTaskIdFromId(task.id)
          
          // Primary matching: use routine_task_id - this is the most reliable way
          // since calendar tasks have day suffixes in their IDs (e.g., taskId_wednesday)
          if (tRoutineTaskId && dragRoutineTaskId && tRoutineTaskId === dragRoutineTaskId) {
            console.log('[DND-KIT] ✅ REMOVING task from source (by routine_task_id):', t.name, 'taskId:', t.id, 'routineTaskId:', tRoutineTaskId)
            return false // Remove this task
          }
          
          // Fallback: if no routine_task_id, check if IDs match exactly or by base ID
          if (!tRoutineTaskId || !dragRoutineTaskId) {
            // Check exact ID match
            if (t.id === task.id) {
              console.log('[DND-KIT] ✅ REMOVING task from source (by exact ID):', t.name, 'taskId:', t.id)
              return false // Remove this task
            }
            
            // Check base ID match (remove day suffix)
            const tBaseId = t.id.split('_').slice(0, -1).join('_') || t.id
            const dragBaseId = task.id.split('_').slice(0, -1).join('_') || task.id
            if (tBaseId === dragBaseId && tBaseId !== t.id) {
              // Only match by base ID if both have day suffixes
              console.log('[DND-KIT] ✅ REMOVING task from source (by base ID):', t.name, 'taskId:', t.id, 'baseId:', tBaseId)
              return false // Remove this task
            }
          }
          
          // Keep this task (it doesn't match the moved task)
          return true
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
          
          // Ensure all tasks in calculatedTaskOrder have explicit memberId set and correct ID
          const calculatedTaskOrderWithMemberIds = calculatedTaskOrder.map((t: Task) => {
            const tRoutineTaskId = t.routine_task_id || extractRoutineTaskIdFromId(t.id)
            const isMovedTask = tRoutineTaskId === routineTaskIdToMove
            if (isMovedTask) {
              // Update task ID to match target day format and ensure moved task has correct memberId
              const baseTaskId = t.routine_task_id || t.id.split('_')[0]
              const newTaskId = sourceDay !== targetDay 
                ? `${baseTaskId}_${targetDay}` // Update ID to include target day
                : t.id // Keep same ID for same-day moves
              
              return { 
                ...t, 
                id: newTaskId,
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
        
        // Add to target day/member while preserving other members' tasks
        const existingTarget = newCalendarTasks[targetDay]?.individualTasks || []
        const otherMembersOnTarget = existingTarget.filter((t: Task) => {
          const mId = t.memberId || extractRoutineTaskIdFromId(t.id)
          return mId !== targetMemberId
        })
        
        // Also filter out any existing tasks for the target member with the same routine_task_id
        // to prevent duplicates when moving a task to a day where it already exists
        const existingTargetMemberTasks = existingTarget.filter((t: Task) => {
          const mId = t.memberId || extractRoutineTaskIdFromId(t.id)
          if (mId !== targetMemberId) return false
          
          const tRoutineTaskId = t.routine_task_id || extractRoutineTaskIdFromId(t.id)
          const dragRoutineTaskId = task.routine_task_id || extractRoutineTaskIdFromId(task.id)
          
          // Keep tasks that don't match the moved task's routine_task_id
          // Use both routineTaskIdToMove and dragRoutineTaskId for comparison
          if (tRoutineTaskId && dragRoutineTaskId && tRoutineTaskId === dragRoutineTaskId) {
            console.log('[DND-KIT] 🚫 Filtering duplicate from target day:', t.name, 'taskId:', t.id, 'routineTaskId:', tRoutineTaskId)
            return false // Remove duplicate
          }
          if (tRoutineTaskId === routineTaskIdToMove) {
            console.log('[DND-KIT] 🚫 Filtering duplicate from target day (by routineTaskIdToMove):', t.name, 'taskId:', t.id, 'routineTaskId:', tRoutineTaskId)
            return false // Remove duplicate
          }
          
          return true // Keep this task
        })
        
        // Combine: other members' tasks + existing target member tasks (excluding moved task) + newly placed tasks
        newCalendarTasks[targetDay] = {
          ...newCalendarTasks[targetDay],
          individualTasks: [
            ...otherMembersOnTarget,
            ...existingTargetMemberTasks,
            ...calculatedTaskOrder
          ]
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
          // For recurring tasks, REPLACE all days with just the target day
          // This is a "move" operation, not an "add" - we don't want to preserve other days
          // that might have accumulated from previous moves or other operations
          if (task.recurring_template_id) {
            const template = recurringTemplates.find(t => t.id === task.recurring_template_id)
            const currentDays = template?.days_of_week || []
            const isMulti = (currentDays?.length || 0) > 1

            // For multi-day recurring: replace only the source day with target day (keep others)
            // For single-day: replace with [targetDay]
            const finalDays = isMulti
              ? Array.from(new Set([...(currentDays.filter(d => d !== sourceDay)), targetDay]))
              : [targetDay]

            console.log('[DND-KIT] 🔄 Updating recurring template days (MOVE operation):', {
              templateId: task.recurring_template_id,
              sourceDay,
              targetDay,
              currentDays,
              finalDays,
              note: isMulti ? 'Multi-day: swap source->target' : 'Single-day: replace days with target'
            })

            const { updateTemplateDays } = await import('../../../../lib/api')
            await updateTemplateDays(currentRoutineId, task.recurring_template_id, {
              days_of_week: finalDays
            })
            
            // Update recurringTemplates state immediately to reflect the change
            // This ensures the icon appears without refresh
            if (setRecurringTemplates) {
              setRecurringTemplates(prevTemplates => {
                return prevTemplates.map(t => {
                  if (t.id === task.recurring_template_id) {
                    return {
                      ...t,
                      days_of_week: [...finalDays] // Create new array reference
                    };
                  }
                  return t;
                });
              });
            }
          } else {
            // For non-recurring tasks, just set the day to the target
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
                    // Update all days for this routine task to the new member
                    Object.keys(updated).forEach(d => {
                      updated[d] = {
                        ...updated[d],
                        individualTasks: updated[d].individualTasks.map((t: Task) => {
                          const tRoutineTaskId = t.routine_task_id || extractRoutineTaskIdFromId(t.id)
                          if (tRoutineTaskId === routineTaskId) {
                            return {
                              ...t,
                              memberId: targetMemberId,
                              assignees: undefined
                            }
                          }
                          return t
                        })
                      }
                    })
                    return updated
                  })
                }
              }
            }
          } catch (error) {
            console.error('[DND-KIT] ❌ Failed to update member assignment:', error)
          }
        }
        
        await saveDaySpecificOrder(targetDay, targetMemberId, calculatedTaskOrder)
        
        // Reload data after all backend updates complete to ensure UI is in sync
        // For same-day reordering, we need to reload to get the updated day orders
        // For cross-day moves, we need to reload to ensure tasks are removed from source day
        if (reloadRoutineData) {
          if (sourceDay === targetDay) {
            console.log('[DND-KIT] 🔄 Reloading data after same-day reordering to get updated day orders')
          } else {
            console.log('[DND-KIT] 🔄 Reloading data after cross-day move to ensure consistency')
          }
          await reloadRoutineData()
        }
      } catch (error) {
        console.error('[DND-KIT] ❌ Failed to save day-specific order:', error)
      }
    }
  }, [currentRoutineId, calendarTasks, extractRoutineTaskIdFromId, updateCalendarTasks, saveDaySpecificOrder, reloadRoutineData, recurringTemplates, setRecurringTemplates])

  // Rollback function to restore previous state
  const rollbackOptimistic = useCallback(() => {
    if (rollbackStateRef.current) {
      updateCalendarTasks(() => rollbackStateRef.current!)
      rollbackStateRef.current = null
    }
  }, [updateCalendarTasks])

  // Handle drag end with optimistic updates and saving tracker
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
    
    const routineTaskId = draggedTaskData.routine_task_id || extractRoutineTaskIdFromId(draggedTaskData.id)
    const template = draggedTaskData.recurring_template_id
      ? recurringTemplates.find(t => t.id === draggedTaskData.recurring_template_id)
      : undefined
    const isMultiDayRecurring = !!template && (template.days_of_week?.length || 0) > 1
    const opKey = getOpKey(draggedTaskData)
    
    // Check if this task is already pending (prevent double drags)
    if (isPending(opKey)) {
      console.log('[DND-KIT] ⚠️ Task is already saving, ignoring drag')
      return
    }
    
    console.log('[DND-KIT] 🎯 Drop:', {
      taskName: draggedTaskData.name,
      source: `${sourceDay}/${sourceMemberId}`,
      target: `${targetDay}/${targetMemberId}`
    })
    
    // Pre-flight rule: if multi-day recurring and dropping into a day that already
    // has an instance of the same task for the same member, open edit modal and abort
    if (isMultiDayRecurring && sourceDay !== targetDay) {
      const targetHasSame = (calendarTasks[targetDay]?.individualTasks || []).some((t: Task) => {
        const tRoutineTaskId = t.routine_task_id || extractRoutineTaskIdFromId(t.id)
        const tMemberId = t.memberId || extractRoutineTaskIdFromId(t.id)
        return tRoutineTaskId === routineTaskId && tMemberId === targetMemberId
      })
      if (targetHasSame) {
        if (onOpenEditModal) onOpenEditModal(draggedTaskData)
        return
      }
    }

    // Save current state for rollback
    rollbackStateRef.current = JSON.parse(JSON.stringify(calendarTasks))
    
    // Mark task as pending
    setPendingTaskIds(prev => new Set([...prev, draggedTaskData.id]))
    
    // Create drag over position for the move operation
    const dragOverPosition: DragOverPosition = {
      day: targetDay,
      memberId: targetMemberId,
      position,
      targetTaskId
    }
    
    // Start tracking save operation
    const done = begin(opKey)
    setIsReordering(true)
    setReorderingDay(targetDay)
    setSourceDay(sourceDay)
    
    // Announce to screen readers
    const announceElement = document.getElementById('saving-announcements')
    if (announceElement) {
      announceElement.textContent = 'Saving changes'
    }
    
    // For same-day same-member reorders, use debouncing
    const isReorderOnly = sourceDay === targetDay && sourceMemberId === targetMemberId
    const debounceKey = isReorderOnly ? `${sourceDay}-${sourceMemberId}` : null
    
    try {
      const performSave = async () => {
        await moveTaskToPosition(draggedTaskData, sourceDay, sourceMemberId, targetDay, targetMemberId, dragOverPosition)
      }
      
      if (debounceKey && debounceTimersRef.current.has(debounceKey)) {
        // Clear existing timer and set new one
        clearTimeout(debounceTimersRef.current.get(debounceKey)!)
      }
      
      if (isReorderOnly && debounceKey) {
        // Debounce reorders in same column
        await new Promise<void>((resolve) => {
          const timer = setTimeout(async () => {
            await performSave()
            debounceTimersRef.current.delete(debounceKey)
            resolve()
          }, 400)
          debounceTimersRef.current.set(debounceKey, timer)
        })
      } else {
        // Immediate save for cross-day/cross-member moves
        await performSave()
      }
      
      // Success - update ARIA and clear pending
      if (announceElement) {
        announceElement.textContent = 'Saved successfully'
        setTimeout(() => {
          announceElement.textContent = ''
        }, 1000)
      }
      
      // Show success toast for member transfers
      if (sourceMemberId !== targetMemberId) {
        const sourceMemberName = getMemberNameById ? getMemberNameById(sourceMemberId) : 'member'
        const targetMemberName = getMemberNameById ? getMemberNameById(targetMemberId) : 'member'
        toast({
          title: "Task reassigned",
          description: `Moved "${draggedTaskData.name}" from ${sourceMemberName} to ${targetMemberName}`,
        })
      } else if (sourceDay !== targetDay) {
        // Show success toast for day changes
        const dayNames: Record<string, string> = {
          monday: 'Monday',
          tuesday: 'Tuesday',
          wednesday: 'Wednesday',
          thursday: 'Thursday',
          friday: 'Friday',
          saturday: 'Saturday',
          sunday: 'Sunday'
        }
        toast({
          title: "Task moved",
          description: `Moved "${draggedTaskData.name}" to ${dayNames[targetDay] || targetDay}`,
        })
      }
      
      setIsReordering(false)
      setReorderingDay(null)
      setSourceDay(null)
      setPendingTaskIds(prev => {
        const next = new Set(prev)
        next.delete(draggedTaskData.id)
        return next
      })
      rollbackStateRef.current = null
      
    } catch (error) {
      console.error('[DND-KIT] ❌ Error during task drop:', error)
      
      // Rollback optimistic update
      rollbackOptimistic()
      
      // Clear pending state
      setIsReordering(false)
      setReorderingDay(null)
      setSourceDay(null)
      setPendingTaskIds(prev => {
        const next = new Set(prev)
        next.delete(draggedTaskData.id)
        return next
      })
      
      // Update ARIA
      if (announceElement) {
        announceElement.textContent = 'Save failed'
      }
      
      // Show error toast with retry
      const retryDragOverPosition: DragOverPosition = {
        day: targetDay,
        memberId: targetMemberId,
        position,
        targetTaskId
      }
      
      const retryAction = React.createElement(ToastAction, {
        altText: "Try again",
        onClick: async () => {
          // Retry the operation
          const retryDone = begin(opKey)
          setPendingTaskIds(prev => new Set([...prev, draggedTaskData.id]))
          try {
            await moveTaskToPosition(draggedTaskData, sourceDay, sourceMemberId, targetDay, targetMemberId, retryDragOverPosition)
            setPendingTaskIds(prev => {
              const next = new Set(prev)
              next.delete(draggedTaskData.id)
              return next
            })
          } catch (retryError) {
            console.error('[DND-KIT] ❌ Retry failed:', retryError)
            setPendingTaskIds(prev => {
              const next = new Set(prev)
              next.delete(draggedTaskData.id)
              return next
            })
            toast({
              title: "Error",
              description: "Failed to save again. Please try manually.",
              variant: "destructive",
            })
          } finally {
            retryDone()
          }
        }
      }, "Try again")
      
      toast({
        title: "Error",
        description: "Couldn't save changes. Reverted.",
        variant: "destructive",
        action: retryAction as any,
      })
    } finally {
      done()
    }
  }, [toast, moveTaskToPosition, begin, isPending, getOpKey, extractRoutineTaskIdFromId, calendarTasks, updateCalendarTasks, rollbackOptimistic])

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

  const getTasksWithDayOrder = useCallback((tasks: Task[], day: string, memberId: string, routineFilter?: 'ALL' | 'UNASSIGNED' | string): Task[] => {
    if (!dayOrders || !dayOrders.length) {
      return tasks
    }

    // Find all day-specific orders for this member/day (regardless of group when filter is "ALL")
    const memberDayOrders = dayOrders.filter(order => {
      return order.member_id === memberId && order.day_of_week === day
    })

    if (!memberDayOrders.length) {
      return tasks
    }

    // IMPORTANT: When filter is "ALL", we want global ordering (tasks can be mixed across groups)
    // When filter is a specific group, we want per-group ordering (each group has its own sequence)
    if (routineFilter === 'ALL') {
      // Global ordering: sort all tasks by their order_index globally, regardless of group
      console.log('[DND-KIT] 🌐 Global ordering (filter=ALL):', {
        tasksCount: tasks.length,
        ordersCount: memberDayOrders.length,
        tasks: tasks.map(t => ({
          name: t.name,
          routine_task_id: t.routine_task_id || extractRoutineTaskIdFromId(t.id),
          group_id: t.group_id
        })),
        orders: memberDayOrders.map(o => ({
          routine_task_id: o.routine_task_id,
          group_id: o.group_id,
          order_index: o.order_index
        }))
      })
      
      const sorted = tasks.sort((a, b) => {
        const routineTaskIdA = a.routine_task_id || extractRoutineTaskIdFromId(a.id)
        const routineTaskIdB = b.routine_task_id || extractRoutineTaskIdFromId(b.id)
        
        const orderA = memberDayOrders.find(order => order.routine_task_id === routineTaskIdA)
        const orderB = memberDayOrders.find(order => order.routine_task_id === routineTaskIdB)
        
        if (!orderA && !orderB) return 0
        if (!orderA) return 1
        if (!orderB) return -1
        
        // Sort by global order_index (allows mixing groups)
        const result = orderA.order_index - orderB.order_index
        console.log('[DND-KIT] 🔄 Comparing:', {
          taskA: a.name,
          taskB: b.name,
          orderA: orderA.order_index,
          orderB: orderB.order_index,
          result
        })
        return result
      })
      
      console.log('[DND-KIT] ✅ Sorted tasks (global):', sorted.map(t => ({
        name: t.name,
        order_index: memberDayOrders.find(o => o.routine_task_id === (t.routine_task_id || extractRoutineTaskIdFromId(t.id)))?.order_index
      })))
      
      return sorted
    } else {
      // Per-group ordering: group tasks by group_id and sort within each group
      const tasksByGroup = new Map<string | null, Task[]>()
      
      tasks.forEach(task => {
        const groupId = task.group_id || null
        if (!tasksByGroup.has(groupId)) {
          tasksByGroup.set(groupId, [])
        }
        tasksByGroup.get(groupId)!.push(task)
      })
      
      // Sort tasks within each group using their day-specific orders
      const sortedTasks: Task[] = []
      
      tasksByGroup.forEach((groupTasks, groupId) => {
        // Find day-specific orders for this member/day/group
        const groupOrders = memberDayOrders.filter(order => {
          const orderGroupId = order.group_id || null
          return orderGroupId === groupId
        })

        if (groupOrders.length > 0) {
          // Sort tasks by their day-specific order within this group
          groupTasks.sort((a, b) => {
            const routineTaskIdA = a.routine_task_id || extractRoutineTaskIdFromId(a.id)
            const routineTaskIdB = b.routine_task_id || extractRoutineTaskIdFromId(b.id)
            
            const orderA = groupOrders.find(order => order.routine_task_id === routineTaskIdA)
            const orderB = groupOrders.find(order => order.routine_task_id === routineTaskIdB)
            
            if (!orderA && !orderB) return 0
            if (!orderA) return 1
            if (!orderB) return -1
            
            return orderA.order_index - orderB.order_index
          })
        }
        
        sortedTasks.push(...groupTasks)
      })
      
      return sortedTasks
    }
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
    loadDayOrders,
    
    // Pending state helpers
    isTaskPending
  }
}
