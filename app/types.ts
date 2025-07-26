export interface FamilyMember {
  id: string
  name: string
  role: 'parent' | 'child'
  color: string
  avatarStyle?: string
  avatarOptions?: Record<string, string>
  avatarUrl?: string
}

export interface Chore {
  id: string
  title: string
  description: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'once'
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'anytime'
  category?: string
  assignedTo: string
  points: number
  completed: boolean
  dueDate?: string
}

export interface Activity {
  id: string
  title: string
  description: string
  location?: string
  time?: string
  duration?: number
  frequency?: 'daily' | 'weekly' | 'monthly' | 'once'
  daysOfWeek?: string[]
  icon?: string
  assignedTo?: string[]
  scheduled_date?: string
  depends_on_chores?: string[]
}

export interface Reward {
  id: string
  title: string
  description: string
  type: 'points' | 'activity' | 'privilege'
  conditions: {
    choresCompleted?: number
    pointsEarned?: number
    daysStreak?: number
  }
  icon?: string
  availableTo?: string[]
  threshold?: number
}

export interface Family {
  name: string
  members: FamilyMember[]
} 