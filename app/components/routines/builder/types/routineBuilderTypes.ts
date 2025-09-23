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
  from_group?: { // Track which group this task came from
    id: string
    name: string
    template_id?: string
  }
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
  mode: 'single' | 'everyday' | 'custom'
  selectedDays: string[]
}

// Re-export imported types for convenience
export type { FamilyMember, DaySpecificOrder, BulkDayOrderUpdate, RoutineScheduleData }
