import type { Task, TaskGroup, RecurringTemplate } from '../types/routineBuilderTypes'

// Helper function to extract member ID from task/group ID
export const extractMemberIdFromId = (id: string, selectedMemberId?: string | null): string => {
  // ID format: templateId-memberId-day-timestamp
  // Since UUIDs contain dashes, we need to find the member ID by looking for the pattern
  // The member ID is the second UUID in the string (after the template UUID)
  const parts = id.split('-')
  
  // If we have at least 9 parts (template UUID has 5 parts, member UUID has 5 parts)
  if (parts.length >= 9) {
    // Template UUID: parts[0-4], Member UUID: parts[5-9]
    return `${parts[5]}-${parts[6]}-${parts[7]}-${parts[8]}-${parts[9]}`
  }
  
  // Fallback: try to find member ID by looking for the selected member ID in the string
  if (selectedMemberId && id.includes(selectedMemberId)) {
    return selectedMemberId
  }
  
  // Last resort: return empty string
  return ''
}

export const extractRoutineTaskIdFromId = (id: string): string => {
  // ID format: templateId-memberId-day-timestamp
  // We need the templateId (routine_task_id) which is the first UUID
  const parts = id.split('-')
  
  // If we have at least 5 parts (template UUID has 5 parts)
  if (parts.length >= 5) {
    // Template UUID: parts[0-4]
    return `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}-${parts[4]}`
  }
  
  return id // Fallback to original ID
}

export const getTotalTasksForDay = (
  day: string, 
  calendarTasks: Record<string, { groups: TaskGroup[], individualTasks: Task[] }>,
  selectedMemberId: string | null
) => {
  const dayTasks = calendarTasks[day]
  
  if (!dayTasks) {
    return 0
  }
  
  // Filter groups by selected member
  const filteredGroups = dayTasks.groups.filter((group: TaskGroup) => {
    const groupMemberId = extractMemberIdFromId(group.id, selectedMemberId)
    const matches = groupMemberId === selectedMemberId
    return matches
  })
  
  // Filter individual tasks by selected member
  const filteredIndividualTasks = dayTasks.individualTasks.filter((task: Task) => {
    // Filter tasks by selected member ID
    const matches = task.memberId === selectedMemberId
    console.log('[FILTER-DEBUG] Filtering task:', {
      taskName: task.name,
      taskId: task.id,
      taskMemberId: task.memberId,
      selectedMemberId: selectedMemberId,
      matches: matches
    });
    return matches
  })
  
  const total = filteredGroups.reduce((sum: number, group: TaskGroup) => sum + group.tasks.length, 0) + filteredIndividualTasks.length
  return total
}

// Derive schedule from calendar task placement
export const deriveScheduleFromCalendar = (
  calendarTasks: Record<string, { groups: TaskGroup[], individualTasks: Task[] }>,
  selectedMemberId: string | null
) => {
  const daysWithTasks = Object.keys(calendarTasks).filter(day => getTotalTasksForDay(day, calendarTasks, selectedMemberId) > 0)
  
  if (daysWithTasks.length === 0) {
    return { scope: 'everyday' as const, days_of_week: [] }
  }
  
  if (daysWithTasks.length === 7) {
    return { scope: 'everyday' as const, days_of_week: [] }
  }
  
  if (daysWithTasks.length === 5 && 
      daysWithTasks.includes('monday') && 
      daysWithTasks.includes('tuesday') && 
      daysWithTasks.includes('wednesday') && 
      daysWithTasks.includes('thursday') && 
      daysWithTasks.includes('friday') &&
      !daysWithTasks.includes('saturday') &&
      !daysWithTasks.includes('sunday')) {
    return { scope: 'weekdays' as const, days_of_week: [] }
  }
  
  if (daysWithTasks.length === 2 && 
      daysWithTasks.includes('saturday') && 
      daysWithTasks.includes('sunday') &&
      !daysWithTasks.includes('monday') &&
      !daysWithTasks.includes('tuesday') &&
      !daysWithTasks.includes('wednesday') &&
      !daysWithTasks.includes('thursday') &&
      !daysWithTasks.includes('friday')) {
    return { scope: 'weekends' as const, days_of_week: [] }
  }
  
  // Custom schedule with specific days
  return { 
    scope: 'custom' as const, 
    days_of_week: daysWithTasks 
  }
}

// Get frequency type of a task based on its recurring template
export const getTaskFrequencyType = (
  task: Task,
  recurringTemplates: RecurringTemplate[]
): 'just_this_day' | 'every_day' | 'specific_days' => {
  console.log('[FREQUENCY-TYPE] 🔍 DEBUG: getTaskFrequencyType called with:', {
    taskName: task.name,
    taskRecurringTemplateId: task.recurring_template_id,
    availableTemplates: recurringTemplates.length,
    templateIds: recurringTemplates.map(t => t.id)
  })
  
  // If task has no recurring template, it's a single day task
  if (!task.recurring_template_id) {
    console.log('[FREQUENCY-TYPE] No recurring_template_id, returning just_this_day')
    return 'just_this_day'
  }
  
  // Find the recurring template
  const template = recurringTemplates.find(t => t.id === task.recurring_template_id)
  
  if (!template) {
    console.warn('[FREQUENCY-TYPE] Template not found for task:', task.name, 'template_id:', task.recurring_template_id)
    console.warn('[FREQUENCY-TYPE] Available template IDs:', recurringTemplates.map(t => t.id))
    return 'just_this_day' // Fallback to single day
  }
  
  console.log('[FREQUENCY-TYPE] ✅ Found template for task:', task.name, 'frequency_type:', template.frequency_type)
  return template.frequency_type as 'just_this_day' | 'every_day' | 'specific_days'
}

// Get days of week for a task based on its recurring template
export const getTaskDaysOfWeek = (
  task: Task,
  recurringTemplates: RecurringTemplate[]
): string[] => {
  // If task has no recurring template, return the task's own days_of_week
  if (!task.recurring_template_id) {
    return task.days_of_week || []
  }
  
  // Find the recurring template
  const template = recurringTemplates.find(t => t.id === task.recurring_template_id)
  
  if (!template) {
    console.warn('[DAYS-OF-WEEK] Template not found for task:', task.name, 'template_id:', task.recurring_template_id)
    return task.days_of_week || [] // Fallback to task's own days
  }
  
  console.log('[DAYS-OF-WEEK] Found template for task:', task.name, 'days_of_week:', template.days_of_week)
  return template.days_of_week || []
}
