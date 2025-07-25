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
 * 
 * Implemented Functions (14 total):
 * - User: getUser(), setUser(), removeUser()
 * - Family: getFamily(), setFamily()
 * - Members: getMembers(), setMembers()
 * - Chores: getChores(), setChores()
 * - Activities: getActivities(), setActivities()
 * - Rewards: getRewards(), setRewards()
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

  // Clear all data
  clearAll: () => {
    if (typeof window === "undefined") return
    localStorage.removeItem("kidoers_user")
    localStorage.removeItem("kidoers_family")
    localStorage.removeItem("kidoers_members")
    localStorage.removeItem("kidoers_chores")
    localStorage.removeItem("kidoers_activities")
    localStorage.removeItem("kidoers_rewards")
  },
}
