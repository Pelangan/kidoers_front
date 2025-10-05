import type { FamilyMember } from '../../../../types'
import type { DaySpecificOrder, BulkDayOrderUpdate } from '../../../../lib/api'
import type { RoutineScheduleData } from '../RoutineDetailsModal'

// Main component props
export interface ManualRoutineBuilderProps {
  familyId?: string
  onComplete?: () => void
  isEditMode?: boolean
  onBack?: () => void
}

// Task interface
export interface Task {
  id: string
  name: string
  description: string | null
  points: number
  estimatedMinutes: number
  completed?: boolean
  is_system?: boolean
  time_of_day?: "morning" | "afternoon" | "evening" | "night" | null
  template_id?: string // Store the original template ID
  recurring_template_id?: string // Store the recurring template ID for grouping
  is_saved?: boolean // Track if this task has been saved to backend
  memberId?: string // Store the member ID for filtering
  days_of_week?: string[] // Days when this task should appear
  frequency?: string // Task frequency: one_off, daily, specific_days, weekly
  from_group?: { // Track which group this task came from
    id: string
    name: string
    template_id?: string
  }
  // Multi-member task fields
  member_count?: number // Number of members assigned to this task
  assignees?: Array<{ // List of assignees for multi-member tasks
    id: string
    name: string
    role: string
    avatar_url?: string | null
    color: string
  }>
  routine_task_id?: string // Backend routine task ID for multi-member tasks
}

// Task group interface
export interface TaskGroup {
  id: string
  name: string
  description: string
  tasks: Task[]
  color: string
  is_system?: boolean
  time_of_day?: "morning" | "afternoon" | "evening" | "night" | null
  template_id?: string // Store the original template ID
  is_saved?: boolean // Track if this group has been saved to backend
}

// Apply to option interface
export interface ApplyToOption {
  id: string
  label: string
  icon: React.ReactNode
  filter: (members: any[]) => any[]
}

// Pending drop interface
export interface PendingDrop {
  type: 'task' | 'group'
  item: Task | TaskGroup
  targetMemberId: string
  targetMemberName: string
  targetDay: string
  selectedTasks?: Task[] // For individual task selection within groups
  fromGroup?: TaskGroup // Track which group a task came from
}

// Day selection interface
export interface DaySelection {
  mode: 'everyday' | 'custom'
  selectedDays: string[]
}

// Recurring template interface
export interface RecurringTemplate {
  id: string
  routine_id: string
  name: string
  description: string | null
  points: number
  duration_mins: number | null
  time_of_day: string | null
  frequency_type: string // 'just_this_day', 'every_day', 'specific_days'
  days_of_week: string[]
  frequency: string
  created_at: string
  updated_at: string
}

// Enhanced family member interface
export interface EnhancedFamilyMember {
  id: string
  name: string
  type: string
  color: string
  avatar_url?: string
  avatar_style?: string
  avatar_seed?: string
  avatar_options?: any
  borderColor: string
  taskBgColor: string
  groups: TaskGroup[]
  individualTasks: Task[]
}

// Re-export imported types for convenience
export type { FamilyMember, DaySpecificOrder, BulkDayOrderUpdate, RoutineScheduleData }
