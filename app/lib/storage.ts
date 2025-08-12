/**
 * Data Storage System
 * 
 * This file implements the localStorage-based data persistence system for the Kidoers application.
 * All application data is stored in browser localStorage (prototype mode).
 * 
 * For complete documentation, see: docs/PROJECT_SPECIFICATIONS.md
 * 
 * Storage Keys:
 * - kidoers_user - Current user data
 * - kidoers_family - Family information  
 * - kidoers_members - Family members list
 * - kidoers_chores - Chores/tasks
 * - kidoers_activities - Calendar activities
 * - kidoers_rewards - Family rewards
 * - kidoers_routines - Family routines
 * - kidoers_routine_task_groups - Routine task groups
 * - kidoers_routine_tasks - Routine tasks
 * 
 * Implemented Functions (17 total):
 * - User: getUser(), setUser(), removeUser()
 * - Family: getFamily(), setFamily()
 * - Members: getMembers(), setMembers()
 * - Chores: getChores(), setChores()
 * - Activities: getActivities(), setActivities()
 * - Rewards: getRewards(), setRewards()
 * - Routines: getRoutines(), setRoutines()
 * - Routine Task Groups: getRoutineTaskGroups(), setRoutineTaskGroups()
 * - Routine Tasks: getRoutineTasks(), setRoutineTasks()
 * - Utility: clearAll()
 */

// Local storage utilities for persisting data
export const storage = {
  // User data
  getUser: () => {
    if (typeof window === "undefined") return null
    const user = localStorage.getItem("kidoers_user")
    return user ? JSON.parse(user) : null
  },

  setUser: (user: any) => {
    if (typeof window === "undefined") return
    localStorage.setItem("kidoers_user", JSON.stringify(user))
  },

  removeUser: () => {
    if (typeof window === "undefined") return
    localStorage.removeItem("kidoers_user")
  },

  // Family data
  getFamily: () => {
    if (typeof window === "undefined") return null
    const family = localStorage.getItem("kidoers_family")
    return family ? JSON.parse(family) : null
  },

  setFamily: (family: any) => {
    if (typeof window === "undefined") return
    localStorage.setItem("kidoers_family", JSON.stringify(family))
  },

  // Family members
  getMembers: () => {
    if (typeof window === "undefined") return []
    const members = localStorage.getItem("kidoers_members")
    return members ? JSON.parse(members) : []
  },

  setMembers: (members: any[]) => {
    if (typeof window === "undefined") return
    localStorage.setItem("kidoers_members", JSON.stringify(members))
  },

  // Chores
  getChores: () => {
    if (typeof window === "undefined") return []
    const chores = localStorage.getItem("kidoers_chores")
    return chores ? JSON.parse(chores) : []
  },

  setChores: (chores: any[]) => {
    if (typeof window === "undefined") return
    localStorage.setItem("kidoers_chores", JSON.stringify(chores))
  },

  // Activities
  getActivities: () => {
    if (typeof window === "undefined") return []
    const activities = localStorage.getItem("kidoers_activities")
    return activities ? JSON.parse(activities) : []
  },

  setActivities: (activities: any[]) => {
    if (typeof window === "undefined") return
    localStorage.setItem("kidoers_activities", JSON.stringify(activities))
  },

  // Rewards
  getRewards: () => {
    if (typeof window === "undefined") return []
    const rewards = localStorage.getItem("kidoers_rewards")
    return rewards ? JSON.parse(rewards) : []
  },

  setRewards: (rewards: any[]) => {
    if (typeof window === "undefined") return
    localStorage.setItem("kidoers_rewards", JSON.stringify(rewards))
  },

  // Routines
  getRoutines: () => {
    if (typeof window === "undefined") return []
    const routines = localStorage.getItem("kidoers_routines")
    return routines ? JSON.parse(routines) : []
  },

  setRoutines: (routines: any[]) => {
    if (typeof window === "undefined") return
    localStorage.setItem("kidoers_routines", JSON.stringify(routines))
  },

  // Routine Task Groups
  getRoutineTaskGroups: () => {
    if (typeof window === "undefined") return []
    const groups = localStorage.getItem("kidoers_routine_task_groups")
    return groups ? JSON.parse(groups) : []
  },

  setRoutineTaskGroups: (groups: any[]) => {
    if (typeof window === "undefined") return
    localStorage.setItem("kidoers_routine_task_groups", JSON.stringify(groups))
  },

  // Routine Tasks
  getRoutineTasks: () => {
    if (typeof window === "undefined") return []
    const tasks = localStorage.getItem("kidoers_routine_tasks")
    return tasks ? JSON.parse(tasks) : []
  },

  setRoutineTasks: (tasks: any[]) => {
    if (typeof window === "undefined") return
    localStorage.setItem("kidoers_routine_tasks", JSON.stringify(tasks))
  },

  // Clear all data
  clearAll: () => {
    if (typeof window === "undefined") return
    localStorage.removeItem("kidoers_user")
    localStorage.removeItem("kidoers_family")
    localStorage.removeItem("kidoers_members")
    localStorage.removeItem("kidoers_chores")
    localStorage.removeItem("kidoers_activities")
    localStorage.removeItem("kidoers_rewards")
    localStorage.removeItem("kidoers_routines")
    localStorage.removeItem("kidoers_routine_task_groups")
    localStorage.removeItem("kidoers_routine_tasks")
  },

  // Simple onboarding status check using localStorage
  checkOnboardingStatus: () => {
    try {
      const family = localStorage.getItem("kidoers_family")
      const members = localStorage.getItem("kidoers_members")
      
      if (family && members) {
        const familyData = JSON.parse(family)
        const membersData = JSON.parse(members)
        
        if (familyData.id && membersData.length > 0) {
          return {
            needsOnboarding: familyData.onboarding_status !== 'completed',
            currentStep: familyData.onboarding_status === 'completed' ? 'completed' : 'create_routine',
            familyExists: true,
            familyId: familyData.id
          }
        }
      }
      
      return {
        needsOnboarding: true,
        currentStep: 'create_family',
        familyExists: false,
        familyId: null
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error)
      return {
        needsOnboarding: true,
        currentStep: 'create_family',
        familyExists: false,
        familyId: null
      }
    }
  }
}
