import { useState } from 'react'
import { addRoutineTask, createTaskAssignment, bulkCreateIndividualTasks } from '../../../../lib/api'
import { getTotalTasksForDay } from '../utils/taskUtils'
import type { Task, TaskGroup } from '../types/routineBuilderTypes'

interface CalendarTasks {
  groups: TaskGroup[]
  individualTasks: Task[]
}

export const useCalendarTasks = (
  selectedMemberId: string | null,
  ensureRoutineExists: () => Promise<any>,
  setError: (error: string) => void
) => {
  // Calendar data structure - tasks organized by day
  const [calendarTasks, setCalendarTasks] = useState<Record<string, CalendarTasks>>({
    'sunday': { groups: [], individualTasks: [] },
    'monday': { groups: [], individualTasks: [] },
    'tuesday': { groups: [], individualTasks: [] },
    'wednesday': { groups: [], individualTasks: [] },
    'thursday': { groups: [], individualTasks: [] },
    'friday': { groups: [], individualTasks: [] },
    'saturday': { groups: [], individualTasks: [] }
  })

  // UI-only function for adding tasks to calendar (no backend calls)
  const addTaskToCalendarUI = (memberId: string, task: Task, applyTo: string, day: string, fromGroup?: TaskGroup) => {

    const newTaskId = `${task.id}-${memberId}-${day}-${Date.now()}`

    // Add task to calendar for the specified day
    setCalendarTasks(prev => {
      const newState = {
      ...prev,
      [day]: {
        ...prev[day],
        individualTasks: [...prev[day].individualTasks, { 
          ...task, 
            id: newTaskId,
          template_id: task.id, // Store the original template ID
            is_saved: false, // Mark as unsaved
            from_group: fromGroup ? {
              id: fromGroup.id,
              name: fromGroup.name,
              template_id: fromGroup.template_id
            } : undefined
          }]
        }
      }
      return newState
    })
    
    // Day orders are now saved immediately when dragging, no need to track unsaved changes
  }

  const addTaskToCalendar = async (memberId: string, task: Task, applyTo: string, day: string, applyToOptions: any[]) => {
    console.log('[TASK-DEBUG] 🔍 addTaskToCalendar called with applyTo:', applyTo);
    
    // Handle 'none' case directly without looking for applyToOption
    if (applyTo === 'none') {
      // This is the case where we're adding to a specific member only
      console.log('[TASK-DEBUG] 🎯 Adding task to specific member only');
    } else {
      const applyToOption = applyToOptions.find(option => option.id === applyTo)
      if (!applyToOption) {
        console.log('[TASK-DEBUG] ❌ No applyToOption found for:', applyTo);
        return;
      }
    }

    try {
      console.log('[TASK-DEBUG] 🚀 Adding task:', task.name, 'for member:', memberId, 'on day:', day);
      console.log('[TASK-DEBUG] 🔍 Original task ID:', task.id);
      
      // Ensure routine exists first
      console.log('[TASK-DEBUG] 🔍 Ensuring routine exists...');
      const routineData = await ensureRoutineExists();
      if (!routineData) {
        console.log('[TASK-DEBUG] ❌ Failed to create routine');
        setError('Failed to create routine. Please try again.');
        return;
      }
      console.log('[TASK-DEBUG] ✅ Routine exists:', routineData.id);

      // Save task to backend immediately
      console.log('[TASK-DEBUG] 💾 Saving task to backend:', task.name);
      const savedTask = await addRoutineTask(routineData.id, {
        name: task.name,
        description: task.description || undefined,
        points: task.points,
        duration_mins: task.estimatedMinutes,
        time_of_day: task.time_of_day || undefined,
        days_of_week: [day],
        from_task_template_id: task.is_system ? task.id : undefined,
        order_index: 0
      });
      console.log('[TASK-DEBUG] ✅ Task saved to backend:', savedTask);

      // Create task assignment
      console.log('[TASK-DEBUG] 🎯 Creating task assignment...');
      await createTaskAssignment(routineData.id, savedTask.id, memberId, 0);
      console.log('[TASK-DEBUG] ✅ Task assignment created');

      // Add task to calendar with real ID
      console.log('[TASK-DEBUG] 📅 Adding to UI with memberId:', memberId);
      const taskToAdd = { 
        ...task, 
        id: savedTask.id, // Use real ID from backend
        memberId: memberId, // Set the member ID for filtering
        is_saved: true
      };
      console.log('[TASK-DEBUG] 📋 Task object to add:', taskToAdd);
      setCalendarTasks(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          individualTasks: [...prev[day].individualTasks, taskToAdd]
        }
      }))
      
      // Day orders are now saved immediately when dragging, no need to track unsaved changes
      console.log('[TASK-DEBUG] ✅ Task added successfully');
    } catch (e: any) {
      console.error('[TASK-DEBUG] ❌ Error:', e?.message);
      setError(e?.message || 'Failed to save task. Please try again.');
    }
  }

  const removeGroupFromCalendar = (day: string, groupId: string) => {
    setCalendarTasks(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        groups: prev[day].groups.filter((group: TaskGroup) => group.id !== groupId)
      }
    }))
  }

  const addGroupToCalendar = (memberId: string, group: TaskGroup, applyTo: string, day: string, selectedTasks?: Task[]) => {
    // This function will be implemented with the full logic from the main component
    // For now, just add to calendar
    setCalendarTasks(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        groups: [...prev[day].groups, { ...group, id: `${group.id}-${memberId}-${day}-${Date.now()}` }]
      }
    }))
  }

  const addGroupToCalendarUI = (day: string, group: TaskGroup, memberId: string) => {
    setCalendarTasks(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        groups: [...prev[day].groups, { ...group, id: `${group.id}-${memberId}-${day}-${Date.now()}` }]
      }
    }))
  }

  const updateCalendarTasks = (updater: (prev: Record<string, CalendarTasks>) => Record<string, CalendarTasks>) => {
    setCalendarTasks(updater)
  }

  const getTotalTasks = () => {
    return Object.keys(calendarTasks).reduce((sum, day) => sum + getTotalTasksForDay(day, calendarTasks, selectedMemberId), 0)
  }

  return {
    // State
    calendarTasks,
    
    // Setters
    setCalendarTasks,
    
    // Functions
    addTaskToCalendarUI,
    addTaskToCalendar,
    removeGroupFromCalendar,
    addGroupToCalendar,
    addGroupToCalendarUI,
    updateCalendarTasks,
    getTotalTasks
  }
}
