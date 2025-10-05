// Recurrence utility functions for task editing modal
// These functions handle the logic for determining dropdown options and helper labels
// based on recurring_task_templates data

export type RecurrenceOption = 'EVERY_DAY' | 'SPECIFIC_DAYS';

export const ALL_DAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
] as const;

export type Weekday = typeof ALL_DAYS[number];

/**
 * Determines the recurrence option from template data
 * @param days - Array of weekdays from recurring_task_templates.days_of_week
 * @param hasException - Whether this specific occurrence has an exception
 * @returns The appropriate recurrence option for the dropdown
 */
export function optionFromTemplate(days: Weekday[], hasException: boolean): RecurrenceOption {
  // Always prioritize the actual days_of_week array over frequency_type
  // This ensures the UI reflects the real recurrence pattern
  
  if (days.length === 7) {
    // If the series is daily but a single occurrence was skipped/moved,
    // treat UI as "Every day" and surface "(with exceptions)" in helper label.
    return hasException ? 'EVERY_DAY' : 'EVERY_DAY';
  }
  
  // For any other number of days (1-6), treat as specific days
  // This includes single-day weekly tasks and custom day selections
  return 'SPECIFIC_DAYS';
}

/**
 * Generates a helper label that summarizes the recurrence rule
 * @param days - Array of weekdays from recurring_task_templates.days_of_week
 * @param hasException - Whether this specific occurrence has an exception
 * @returns A human-readable description of the recurrence pattern
 */
export function helperLabel(days: Weekday[], hasException: boolean): string {
  const short = (d: Weekday) => d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3);
  
  if (days.length === 7) {
    return `Every day${hasException ? ' (with exceptions)' : ''}`;
  }
  
  if (days.length === 1) {
    const d = days[0];
    return `Every ${d.charAt(0).toUpperCase() + d.slice(1)}`;
  }
  
  if (days.length === 5 && 
      days.includes('monday') && days.includes('tuesday') && 
      days.includes('wednesday') && days.includes('thursday') && 
      days.includes('friday') && !days.includes('saturday') && !days.includes('sunday')) {
    return 'Weekdays';
  }
  
  if (days.length === 2 && 
      days.includes('saturday') && days.includes('sunday') &&
      !days.includes('monday') && !days.includes('tuesday') && 
      !days.includes('wednesday') && !days.includes('thursday') && !days.includes('friday')) {
    return 'Weekends';
  }
  
  // Sort days in chronological order (Monday to Sunday)
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const sortedDays = days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
  
  return `Repeats: ${sortedDays.map(short).join(', ')}`;
}

/**
 * Converts recurrence option to days array
 * @param option - The selected recurrence option
 * @param selectedDays - Currently selected days (for SPECIFIC_DAYS)
 * @returns Array of weekdays
 */
export function optionToDays(option: RecurrenceOption, selectedDays: Weekday[] = []): Weekday[] {
  switch (option) {
    case 'EVERY_DAY':
      return [...ALL_DAYS];
    case 'SPECIFIC_DAYS':
      return selectedDays;
    default:
      return selectedDays;
  }
}

/**
 * Validates that at least one day is selected for SPECIFIC_DAYS option
 * @param option - The selected recurrence option
 * @param selectedDays - Currently selected days
 * @returns Validation error message or null if valid
 */
export function validateRecurrenceSelection(option: RecurrenceOption, selectedDays: Weekday[]): string | null {
  if (option === 'SPECIFIC_DAYS' && selectedDays.length === 0) {
    return 'Select at least one day';
  }
  return null;
}

/**
 * Normalizes weekday names to lowercase
 * @param days - Array of weekday names (may be mixed case)
 * @returns Array of lowercase weekday names
 */
export function normalizeWeekdays(days: string[]): Weekday[] {
  return days
    .map(day => day.toLowerCase())
    .filter((day): day is Weekday => ALL_DAYS.includes(day as Weekday));
}

/**
 * Checks if a day is a valid weekday
 * @param day - Day name to check
 * @returns True if valid weekday
 */
export function isValidWeekday(day: string): day is Weekday {
  return ALL_DAYS.includes(day.toLowerCase() as Weekday);
}

/**
 * Extracts the actual task ID from a task ID that may contain day suffix
 * @param taskId - Task ID that may contain day suffix (e.g., "uuid_wednesday")
 * @returns Clean UUID without day suffix
 */
export function extractTaskId(taskId: string): string {
  return taskId.includes('_') ? taskId.split('_')[0] : taskId;
}
