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
 * - Supabase Integration: checkOnboardingStatus(), checkFamilyExists()
 */

import { supabase } from './supabase'
import { apiService } from './api'

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

  // Supabase Integration Functions
  
  // Test database connection
  testConnection: async () => {
    try {
      console.log('Testing backend API connection...')
      
      // Test the backend API instead of direct Supabase
      const families = await apiService.getFamilies()
      
      console.log('Backend API connection test successful')
      return { success: true, data: families }
    } catch (error) {
      console.error('Backend API connection test error:', error)
      return { success: false, error: (error as any)?.message || 'Unknown error' }
    }
  },

  checkOnboardingStatus: async (userId: string) => {
    try {
      console.log('Checking onboarding status for user:', userId)
      
      // Use backend API to get families instead of direct Supabase query
      const families = await apiService.getFamilies()
      console.log('Families from API:', families)

      if (!families || families.length === 0) {
        console.log('No family found, user needs onboarding')
        return {
          needsOnboarding: true,
          currentStep: 'create_family',
          familyExists: false
        }
      }

      // User has families, check if they have routines
      const familyId = families[0].id
      console.log('Found family ID:', familyId)
      
      // For now, assume onboarding is complete if user has families
      // We can add more sophisticated checks later using the backend API
      console.log('User has family, onboarding appears complete')
      return {
        needsOnboarding: false,
        currentStep: null,
        familyExists: true,
        familyId
      }

    } catch (error) {
      console.error('Error checking onboarding status:', error)
      console.error('Error details:', {
        message: (error as any)?.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint
      })
      
      // Check if it's an authentication error
      if ((error as any)?.message?.includes('401') || (error as any)?.message?.includes('Unauthorized')) {
        console.error('Authentication error detected - user may not be properly authenticated')
        return {
          needsOnboarding: true,
          currentStep: 'create_family',
          familyExists: false,
          authError: true
        }
      }
      
      // Fallback to showing onboarding
      return {
        needsOnboarding: true,
        currentStep: 'create_family',
        familyExists: false
      }
    }
  },

  // Check if user already has a family (created by them)
  checkUserHasFamily: async (userId: string) => {
    try {
      console.log('Checking if user has family via backend API...')
      
      // Use backend API instead of direct Supabase query
      const families = await apiService.getFamilies()
      console.log('Families from API:', families)

      if (families && families.length > 0) {
        // User has families, return the first one
        return {
          id: families[0].id,
          name: families[0].name,
          onboarding_status: 'in_progress' // Default status
        }
      }

      return null
    } catch (error) {
      console.error('Error checking if user has family:', error)
      return null
    }
  },

  // Check if user already has a family
  checkFamilyExists: async (userId: string) => {
    try {
      console.log('Checking family existence via backend API...')
      
      // Use backend API instead of direct Supabase query
      const families = await apiService.getFamilies()
      console.log('Families from API:', families)

      return families && families.length > 0 ? families[0].id : null
    } catch (error) {
      console.error('Error checking family existence:', error)
      return null
    }
  }
}
