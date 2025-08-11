/**
 * API Service for Backend Communication
 * 
 * This file handles all API calls to the Kidoers backend.
 * Uses Supabase JWT tokens for authentication.
 */

import { supabase } from './supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

// Types for API requests and responses
export interface FamilyMember {
  id?: string
  name: string
  role: 'parent' | 'child'
  age?: number | null
  color: string
  avatar_url?: string
}

export interface Family {
  id?: string
  name: string
  created_by?: string
  created_at?: string
}

export interface FamilyWithMembers extends Family {
  members: FamilyMember[]
}

export interface User {
  id: string
  email: string
  name?: string
  is_active: boolean
  onboarding_status: string
}

// API service class
class ApiService {
  private async getAuthToken(): Promise<string | null> {
    try {
      console.log('Getting auth token...')
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Session data:', session)
      
      if (session?.access_token) {
        console.log('Access token found, length:', session.access_token.length)
        return session.access_token
      } else {
        console.log('No access token found in session')
        return null
      }
    } catch (error) {
      console.error('Error getting auth token:', error)
      return null
    }
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await this.getAuthToken()
    console.log('Auth headers - token present:', !!token)
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      console.log('Authorization header added')
    } else {
      console.log('No authorization header added - no token')
    }
    
    return headers
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const headers = await this.getAuthHeaders()
    console.log('Making request to:', url)
    console.log('Request headers:', headers)
    
    const config: RequestInit = {
      ...options,
      headers,
    }

    try {
      console.log('Sending request...')
      const response = await fetch(url, config)
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Response error:', errorData)
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      const responseData = await response.json()
      console.log('Response data:', responseData)
      return responseData
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Family endpoints
  async getFamilies(): Promise<Family[]> {
    return this.makeRequest<Family[]>('/families')
  }

  async createFamily(family: Omit<Family, 'id' | 'created_by' | 'created_at'>): Promise<Family> {
    return this.makeRequest<Family>('/families', {
      method: 'POST',
      body: JSON.stringify(family)
    })
  }

  async createFamilyWithMembers(
    family: Omit<Family, 'id' | 'created_by' | 'created_at'>,
    members: Omit<FamilyMember, 'id'>[]
  ): Promise<FamilyWithMembers> {
    return this.makeRequest<FamilyWithMembers>('/families/with-members', {
      method: 'POST',
      body: JSON.stringify({
        family,
        members
      })
    })
  }

  async getFamily(familyId: string): Promise<Family> {
    return this.makeRequest<Family>(`/families/${familyId}`)
  }

  async updateFamily(familyId: string, family: Partial<Family>): Promise<Family> {
    return this.makeRequest<Family>(`/families/${familyId}`, {
      method: 'PUT',
      body: JSON.stringify(family)
    })
  }

  async deleteFamily(familyId: string): Promise<void> {
    return this.makeRequest<void>(`/families/${familyId}`, {
      method: 'DELETE'
    })
  }

  // Family member endpoints
  async getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
    return this.makeRequest<FamilyMember[]>(`/families/${familyId}/members`)
  }

  async addFamilyMember(
    familyId: string, 
    member: Omit<FamilyMember, 'id'>
  ): Promise<FamilyMember> {
    return this.makeRequest<FamilyMember>(`/families/${familyId}/members`, {
      method: 'POST',
      body: JSON.stringify(member)
    })
  }

  async updateFamilyMember(
    familyId: string,
    memberId: string,
    member: Partial<FamilyMember>
  ): Promise<FamilyMember> {
    return this.makeRequest<FamilyMember>(`/families/${familyId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(member)
    })
  }

  async deleteFamilyMember(familyId: string, memberId: string): Promise<void> {
    return this.makeRequest<void>(`/families/${familyId}/members/${memberId}`, {
      method: 'DELETE'
    })
  }

  // User profile endpoints
  async getUserProfile(): Promise<User> {
    return this.makeRequest<User>('/users/profile')
  }

  async updateUserProfile(updates: Partial<User>): Promise<User> {
    return this.makeRequest<User>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  }

  async getUserById(userId: string): Promise<User> {
    return this.makeRequest<User>(`/users/${userId}`)
  }

  // Routine endpoints
  async createRoutine(routine: any): Promise<any> {
    return this.makeRequest<any>('/routines', {
      method: 'POST',
      body: JSON.stringify(routine)
    })
  }

  async createRoutineTaskGroup(taskGroup: any): Promise<any> {
    return this.makeRequest<any>('/routines/task-groups', {
      method: 'POST',
      body: JSON.stringify(taskGroup)
    })
  }

  async createRoutineTask(task: any): Promise<any> {
    return this.makeRequest<any>('/routines/tasks', {
      method: 'POST',
      body: JSON.stringify(task)
    })
  }
}

// Export singleton instance
export const apiService = new ApiService()
