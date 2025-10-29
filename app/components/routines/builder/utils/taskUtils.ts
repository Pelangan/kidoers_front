import type { Task, TaskGroup, RecurringTemplate } from '../types/routineBuilderTypes'

// Helper function to extract member ID from task/group ID
export const extractMemberIdFromId = (id: string, selectedMemberId?: string | null): string => {
  console.log('[EXTRACT-MEMBER-ID] 🔍 Extracting member ID from:', { id, selectedMemberId })
  
  // ID format: templateId-memberId-day-timestamp
  // Since UUIDs contain dashes, we need to find the member ID by looking for the pattern
  // The member ID is the second UUID in the string (after the template UUID)
  const parts = id.split('-')
  
  console.log('[EXTRACT-MEMBER-ID] 📊 ID parts:', parts)
  
  // If we have at least 9 parts (template UUID has 5 parts, member UUID has 5 parts)
  if (parts.length >= 9) {
    // Template UUID: parts[0-4], Member UUID: parts[5-9]
    const extractedMemberId = `${parts[5]}-${parts[6]}-${parts[7]}-${parts[8]}-${parts[9]}`
    console.log('[EXTRACT-MEMBER-ID] ✅ Extracted member ID:', extractedMemberId)
    return extractedMemberId
  }
  
  // Fallback: try to find member ID by looking for the selected member ID in the string
  if (selectedMemberId && id.includes(selectedMemberId)) {
    console.log('[EXTRACT-MEMBER-ID] ✅ Found selected member ID in string:', selectedMemberId)
    return selectedMemberId
  }
  
  // Last resort: return the selected member ID as fallback, or 'unknown' if not available
  const fallback = selectedMemberId || 'unknown'
  console.log('[EXTRACT-MEMBER-ID] ⚠️ Could not extract member ID, using fallback:', fallback)
  return fallback
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

// Extract task ID from composite ID format (uuid_weekday)
export const extractTaskId = (taskId: string): string => {
  console.log('[EXTRACT-TASK-ID] 🔍 Input:', taskId);
  console.log('[EXTRACT-TASK-ID] 🔍 Contains underscore:', taskId.includes('_'));
  console.log('[EXTRACT-TASK-ID] 🔍 Split result:', taskId.split('_'));
  
  const result = taskId.includes('_') ? taskId.split('_')[0] : taskId;
  console.log('[EXTRACT-TASK-ID] ✅ Result:', result);
  
  return result;
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
    // For multi-member tasks, check if the selected member is in the assignees
    if (task.member_count && task.member_count > 1 && task.assignees) {
      const isAssignedToCurrentMember = task.assignees.some(assignee => assignee.id === selectedMemberId);
      return isAssignedToCurrentMember;
    }
    
    // For single-member tasks, filter by member ID
    const matches = task.memberId === selectedMemberId
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
): 'every_day' | 'specific_days' => {
  console.log('[FREQUENCY-TYPE] 🔍 DEBUG: getTaskFrequencyType called with:', {
    taskName: task.name,
    taskRecurringTemplateId: task.recurring_template_id,
    availableTemplates: recurringTemplates.length,
    templateIds: recurringTemplates.map(t => t.id)
  })
  
  // All tasks must have a recurring template
  if (!task.recurring_template_id) {
    console.warn('[FREQUENCY-TYPE] No recurring_template_id found for task:', task.name)
    return 'specific_days' // Default fallback
  }
  
  // Find the recurring template
  const template = recurringTemplates.find(t => t.id === task.recurring_template_id)
  
  if (!template) {
    console.warn('[FREQUENCY-TYPE] Template not found for task:', task.name, 'template_id:', task.recurring_template_id)
    console.warn('[FREQUENCY-TYPE] Available template IDs:', recurringTemplates.map(t => t.id))
    return 'specific_days' // Fallback
  }
  
  console.log('[FREQUENCY-TYPE] ✅ Found template for task:', task.name, 'frequency_type:', template.frequency_type)
  return template.frequency_type as 'every_day' | 'specific_days'
}

// Get days of week for a task based on its recurring template
export const getTaskDaysOfWeek = (
  task: Task,
  recurringTemplates: RecurringTemplate[]
): string[] => {
  // All tasks must have a recurring template
  if (!task.recurring_template_id) {
    console.warn('[DAYS-OF-WEEK] No recurring_template_id found for task:', task.name)
    return [] // Return empty array as fallback
  }
  
  // Find the recurring template
  const template = recurringTemplates.find(t => t.id === task.recurring_template_id)
  
  if (!template) {
    console.warn('[DAYS-OF-WEEK] Template not found for task:', task.name, 'template_id:', task.recurring_template_id)
    return [] // Return empty array as fallback
  }
  
  console.log('[DAYS-OF-WEEK] Found template for task:', task.name, 'days_of_week:', template.days_of_week)
  return template.days_of_week || []
}

// Get display frequency text for a task
export const getTaskDisplayFrequency = (
  task: Task,
  recurringTemplates: RecurringTemplate[]
): string => {
  // If task has a recurring template, use the template's frequency type and days
  if (task.recurring_template_id) {
    const template = recurringTemplates.find(t => t.id === task.recurring_template_id)
    if (template) {
      const days = template.days_of_week || []
      
      switch (template.frequency_type) {
        case 'every_day':
          return 'Daily'
        case 'specific_days':
          if (days.length === 1) {
            const dayName = days[0].toLowerCase().charAt(0).toUpperCase() + days[0].toLowerCase().slice(1)
            return `Every ${dayName}`
          } else if (days.length === 7) {
            return 'Daily'
          } else if (days.length === 5 && 
                     days.includes('monday') && days.includes('tuesday') && 
                     days.includes('wednesday') && days.includes('thursday') && 
                     days.includes('friday') && !days.includes('saturday') && !days.includes('sunday')) {
            return 'Weekdays'
          } else if (days.length === 2 && 
                     days.includes('saturday') && days.includes('sunday') &&
                     !days.includes('monday') && !days.includes('tuesday') && 
                     !days.includes('wednesday') && !days.includes('thursday') && !days.includes('friday')) {
            return 'Weekends'
          } else if (days.length === 0) {
            return 'Weekly'
          } else {
            // Sort days in chronological order (Monday to Sunday)
            const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const sortedDays = days.sort((a, b) => dayOrder.indexOf(a.toLowerCase()) - dayOrder.indexOf(b.toLowerCase()));
            return `Repeats on ${sortedDays.map(d => d.toLowerCase().charAt(0).toUpperCase() + d.toLowerCase().slice(1)).join(', ')}`
          }
        default:
          return 'Weekly'
      }
    }
  }
  
  // Default fallback for tasks without templates
  return 'Weekly'
}
