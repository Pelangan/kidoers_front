export interface FamilyMember {
  id: string
  name: string
  role: "parent" | "child"
  calmMode: boolean
  textToSpeech: boolean
}

export interface Chore {
  id: string
  title: string
  description: string
  frequency: "daily" | "weekly" | "weekends"
  assignedTo: string
  completed: boolean
}

export interface Reward {
  id: string
  title: string
  description: string
  threshold: number
}

export interface DemoFamily {
  id: string
  name: string
  createdAt: string
}

export interface DemoActivity {
  id: string
  title: string
  description?: string
  scheduled_date: string
  depends_on_chores: boolean
}

// Demo family data
export const demoFamily: DemoFamily = {
  id: "demo-family-001",
  name: "The Johnson Family",
  createdAt: new Date().toISOString(),
}

// Demo family members
export const demoMembers: FamilyMember[] = [
  {
    id: "member-001",
    name: "Sarah",
    role: "parent",
    calmMode: false,
    textToSpeech: false,
  },
  {
    id: "member-002",
    name: "Mike",
    role: "parent",
    calmMode: false,
    textToSpeech: false,
  },
  {
    id: "member-003",
    name: "Emma",
    role: "child",
    calmMode: true,
    textToSpeech: false,
  },
  {
    id: "member-004",
    name: "Jack",
    role: "child",
    calmMode: false,
    textToSpeech: true,
  },
]

// Demo chores with some completed for testing rewards
export const demoChores: Chore[] = [
  // Sarah's chores
  {
    id: "chore-001",
    title: "Prepare breakfast",
    description: "Make healthy breakfast for the family",
    frequency: "daily",
    assignedTo: "member-001",
    completed: true,
  },
  {
    id: "chore-002",
    title: "Check homework",
    description: "Review kids' homework assignments",
    frequency: "daily",
    assignedTo: "member-001",
    completed: false,
  },
  {
    id: "chore-003",
    title: "Weekly grocery shopping",
    description: "Buy groceries for the week",
    frequency: "weekly",
    assignedTo: "member-001",
    completed: true,
  },

  // Mike's chores
  {
    id: "chore-004",
    title: "Take out trash",
    description: "Empty all trash bins and take to curb",
    frequency: "weekly",
    assignedTo: "member-002",
    completed: true,
  },
  {
    id: "chore-005",
    title: "Wash dishes",
    description: "Clean dishes after dinner",
    frequency: "daily",
    assignedTo: "member-002",
    completed: false,
  },
  {
    id: "chore-006",
    title: "Mow the lawn",
    description: "Cut grass and edge the lawn",
    frequency: "weekends",
    assignedTo: "member-002",
    completed: true,
  },

  // Emma's chores
  {
    id: "chore-007",
    title: "Make bed",
    description: "Tidy up bedroom and make bed",
    frequency: "daily",
    assignedTo: "member-003",
    completed: true,
  },
  {
    id: "chore-008",
    title: "Feed the cat",
    description: "Give Whiskers fresh food and water",
    frequency: "daily",
    assignedTo: "member-003",
    completed: true,
  },
  {
    id: "chore-009",
    title: "Organize bookshelf",
    description: "Keep books neat and organized",
    frequency: "weekly",
    assignedTo: "member-003",
    completed: false,
  },

  // Jack's chores
  {
    id: "chore-010",
    title: "Put toys away",
    description: "Clean up toys and games after playing",
    frequency: "daily",
    assignedTo: "member-004",
    completed: true,
  },
  {
    id: "chore-011",
    title: "Set the table",
    description: "Put plates, cups, and utensils on table",
    frequency: "daily",
    assignedTo: "member-004",
    completed: false,
  },
  {
    id: "chore-012",
    title: "Water plants",
    description: "Water the indoor plants",
    frequency: "weekly",
    assignedTo: "member-004",
    completed: true,
  },
]

// Demo activities for the calendar
export const demoActivities: DemoActivity[] = [
  {
    id: "activity-001",
    title: "Soccer Practice",
    description: "Emma's soccer practice at the park",
    scheduled_date: getDateString(1, 16, 0), // Tomorrow at 4:00 PM
    depends_on_chores: false,
  },
  {
    id: "activity-002",
    title: "Family Movie Night",
    description: "Watch a movie together with popcorn",
    scheduled_date: getDateString(2, 19, 30), // Day after tomorrow at 7:30 PM
    depends_on_chores: true,
  },
  {
    id: "activity-003",
    title: "Piano Lesson",
    description: "Jack's weekly piano lesson",
    scheduled_date: getDateString(3, 15, 0), // 3 days from now at 3:00 PM
    depends_on_chores: false,
  },
  {
    id: "activity-004",
    title: "Park Playdate",
    description: "Meet friends at the playground",
    scheduled_date: getDateString(5, 10, 0), // This weekend at 10:00 AM
    depends_on_chores: true,
  },
  {
    id: "activity-005",
    title: "Doctor Appointment",
    description: "Emma's routine checkup",
    scheduled_date: getDateString(6, 14, 30), // Next week at 2:30 PM
    depends_on_chores: false,
  },
  {
    id: "activity-006",
    title: "Family Bike Ride",
    description: "Explore the neighborhood trails",
    scheduled_date: getDateString(7, 9, 0), // Next weekend at 9:00 AM
    depends_on_chores: true,
  },
]

// Demo rewards with different thresholds
export const demoRewards: Reward[] = [
  {
    id: "reward-001",
    title: "Extra Screen Time",
    description: "30 minutes of additional screen time",
    threshold: 5, // Should be earned with current completed chores (7 completed)
  },
  {
    id: "reward-002",
    title: "Pizza Night",
    description: "Family pizza dinner with favorite toppings",
    threshold: 8, // Close to being earned
  },
  {
    id: "reward-003",
    title: "Ice Cream Treat",
    description: "Visit to the local ice cream shop",
    threshold: 10,
  },
  {
    id: "reward-004",
    title: "Movie Theater Trip",
    description: "Go see a new movie at the cinema",
    threshold: 15,
  },
  {
    id: "reward-005",
    title: "Theme Park Visit",
    description: "Special day trip to the amusement park",
    threshold: 25,
  },
]

// Helper function to generate future dates
function getDateString(daysFromNow: number, hour: number, minute: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

// Function to load demo data
export function loadDemoData() {
  if (typeof window === "undefined") return

  const storage = {
    setFamily: (family: DemoFamily) => localStorage.setItem("kidoers_family", JSON.stringify(family)),
    setMembers: (members: FamilyMember[]) => localStorage.setItem("kidoers_members", JSON.stringify(members)),
    setChores: (chores: Chore[]) => localStorage.setItem("kidoers_chores", JSON.stringify(chores)),
    setActivities: (activities: DemoActivity[]) =>
      localStorage.setItem("kidoers_activities", JSON.stringify(activities)),
    setRewards: (rewards: Reward[]) => localStorage.setItem("kidoers_rewards", JSON.stringify(rewards)),
  }

  storage.setFamily(demoFamily)
  storage.setMembers(demoMembers)
  storage.setChores(demoChores)
  storage.setActivities(demoActivities)
  storage.setRewards(demoRewards)
}

// Function to check if demo data should be loaded
export function shouldLoadDemoData(): boolean {
  if (typeof window === "undefined") return false

  const hasFamily = localStorage.getItem("kidoers_family")
  const hasMembers = localStorage.getItem("kidoers_members")
  const hasChores = localStorage.getItem("kidoers_chores")

  // Load demo data if no existing data is found
  return !hasFamily && !hasMembers && !hasChores
}
