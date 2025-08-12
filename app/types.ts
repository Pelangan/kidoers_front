export interface FamilyMember {
  id: string
  name: string
  role: 'parent' | 'child'
  color: string
  age?: number | null
  avatar_url?: string
  calmMode: boolean
  textToSpeech: boolean
  avatarStyle?: string
  avatarOptions?: Record<string, string>
  avatarUrl?: string
}

export interface Chore {
  id: string
  title: string
  description: string
  frequency: 'daily' | 'weekly' | 'weekends'
  timeOfDay: 'morning' | 'afternoon' | 'evening'
  category?: string
  assignedTo: string
  points: number
  completed: boolean
}

export interface Activity {
  id: string
  title: string
  description: string
  location?: string
  time?: string
  duration?: number
  frequency?: 'daily' | 'weekly' | 'monthly'
  daysOfWeek?: string[]
  icon?: string
  assignedTo?: string
  completed: boolean
  scheduled_date?: string
  depends_on_chores?: boolean
}

export interface Reward {
  id: string
  title: string
  description: string
  type: 'complete_tasks' | 'complete_categories' | 'complete_time_slots' | 'specific_tasks' | 'streak' | 'mixed'
  conditions: any
  icon: string
  availableTo: string
  threshold?: number
}

export interface Family {
  name: string
  members: FamilyMember[]
  onboarding_status?: 'not_started' | 'in_progress' | 'completed'
} 