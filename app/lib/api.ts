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

// API service class
class ApiService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await this.getAuthToken()
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || null
    } catch (error) {
      console.error('Error getting auth token:', error)
      return null
    }
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const headers = await this.getAuthHeaders()
    const config: RequestInit = {
      ...options,
      headers,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
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
}

// Export singleton instance
export const apiService = new ApiService()
