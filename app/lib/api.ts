/**
 * API Service for Backend Communication
 * 
 * This file handles all API calls to the Kidoers backend.
 * Uses Supabase JWT tokens for authentication.
 */

import { supabase } from './supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Debug logging to verify the API URL
console.log('API_BASE_URL:', API_BASE_URL)

// Types for API requests and responses
export interface FamilyMember {
  id?: string
  name: string
  role: 'parent' | 'child'
  age?: number | null
  color: string
  avatar_url?: string
  avatar_style?: string
  avatar_seed?: string
  avatar_options?: Record<string, any>
}

export interface Family {
  id?: string
  name: string
  created_by?: string
  created_at?: string
  onboarding_status?: 'not_started' | 'in_progress' | 'completed'
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

// Day-specific order types
export interface DaySpecificOrder {
  id: string
  routine_id: string
  member_id: string
  day_of_week: string
  routine_task_id: string
  order_index: number
  created_at: string
}

export interface DaySpecificOrderCreate {
  routine_id: string
  member_id: string
  day_of_week: string
  routine_task_id: string
  order_index: number
}

export interface DaySpecificOrderUpdate {
  order_index: number
}

export interface BulkDayOrderUpdate {
  member_id: string
  day_of_week: string
  task_orders: Array<{
    routine_task_id: string
    order_index: number
  }>
}

export interface CopyDayOrdersRequest {
  member_id: string
  from_day: string
  to_day: string
}

/** Types mirrored from backend responses */
export type OnboardingStatus =
  | { has_family: false; in_progress: null; current_family: null }
  | { has_family: true; in_progress: null | {
      id: string;
      name: string;
      setup_state: "not_started" | "in_progress" | "complete";
      setup_step: "create_family" | "create_routine" | null;
      subscription_plan?: "free" | "premium";
      trial_start?: string; trial_end?: string;
    }; current_family: {
      id: string;
      name: string;
      setup_state: "not_started" | "in_progress" | "complete";
      setup_step: "create_family" | "create_routine" | null;
      subscription_plan?: "free" | "premium";
      trial_start?: string; trial_end?: string;
    } | null };

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

  async getAuthHeaders(): Promise<HeadersInit> {
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

  async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const headers = await this.getAuthHeaders()
    
    // Log all API requests
    console.log(`🌐 API Request: ${options.method || 'GET'} ${endpoint}`)
    console.log(`   URL: ${url}`)
    console.log(`   Timestamp: ${new Date().toISOString()}`)
    
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
        console.error('Response status:', response.status)
        console.error('Response headers:', Object.fromEntries(response.headers.entries()))
        console.error('Request URL:', url)
        throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`)
      }

      // Handle responses with no content (like DELETE 204)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        console.log('Response has no content')
        return {} as T
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
  async getFamilyMembers(familyId: string): Promise<Array<{
    id: string; family_id: string; name: string; role: "parent" | "child";
    age: number | null; color: string; avatar_url: string | null; 
    avatar_style: string | null; avatar_seed: string | null; 
    avatar_options: Record<string, any> | null; user_id: string | null;
  }>> {
    return this.makeRequest<Array<{
      id: string; family_id: string; name: string; role: "parent" | "child";
      age: number | null; color: string; avatar_url: string | null; 
      avatar_style: string | null; avatar_seed: string | null; 
      avatar_options: Record<string, any> | null; user_id: string | null;
    }>>(`/family-members?family_id=${familyId}`)
  }

  async addFamilyMember(
    familyId: string, 
    member: Omit<FamilyMember, 'id'>
  ): Promise<FamilyMember> {
    return this.makeRequest<FamilyMember>('/family-members', {
      method: 'POST',
      body: JSON.stringify(member)
    })
  }

  async updateFamilyMember(
    familyId: string,
    memberId: string,
    member: Partial<FamilyMember>
  ): Promise<FamilyMember> {
    return this.makeRequest<FamilyMember>(`/family-members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(member)
    })
  }

  async deleteFamilyMember(familyId: string, memberId: string): Promise<void> {
    return this.makeRequest<void>(`/family-members/${memberId}`, {
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

  // Onboarding endpoints
  async getOnboardingStatus(): Promise<OnboardingStatus> {
    return this.makeRequest<OnboardingStatus>('/onboarding/status')
  }

  async completeOnboarding(familyId: string): Promise<any> {
    return this.makeRequest<any>('/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify({
        family_id: familyId
      })
    })
  }

  async startOnboarding(payload: {
    family_name: string;
    members?: Array<{
      name: string;
      role: "parent" | "child";
      age?: number | null;
      color?: "blue" | "green" | "yellow" | "orange" | "purple" | "pink" | "teal" | "indigo";
      avatar_url?: string | null;
      avatar_style?: string;
      avatar_seed?: string;
      avatar_options?: Record<string, any>;
      user_id?: string | null;
      family_id?: string; // will be ignored by backend
    }>;
  }): Promise<{
    id: string; name: string;
    setup_state: string; setup_step: string | null;
    subscription_plan?: string; trial_start?: string; trial_end?: string;
  }> {
    return this.makeRequest<{
      id: string; name: string;
      setup_state: string; setup_step: string | null;
      subscription_plan?: string; trial_start?: string; trial_end?: string;
    }>('/onboarding/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async startOnboardingStep(stepKey: string, familyId?: string, data?: any): Promise<any> {
    return this.makeRequest<any>('/onboarding/step/start', {
      method: 'POST',
      body: JSON.stringify({
        step_key: stepKey,
        family_id: familyId,
        data: data
      })
    })
  }

  async completeOnboardingStep(stepKey: string, familyId?: string, data?: any): Promise<any> {
    return this.makeRequest<any>('/onboarding/step/complete', {
      method: 'PUT',
      body: JSON.stringify({
        step_key: stepKey,
        family_id: familyId,
        data: data
      })
    })
  }

  async getOnboardingStepProgress(stepKey: string): Promise<any> {
    return this.makeRequest<any>(`/onboarding/step/${stepKey}/progress`)
  }

  async getAllOnboardingStepsProgress(): Promise<any[]> {
    return this.makeRequest<any[]>('/onboarding/steps/progress')
  }

  async updateOnboardingStep(familyId: string, step: 'create_routine'): Promise<any> {
    return this.makeRequest<any>('/onboarding/step', {
      method: 'POST',
      body: JSON.stringify({
        family_id: familyId,
        step: step
      })
    })
  }
}

// Export singleton instance
export const apiService = new ApiService()

// Additional API functions for onboarding edit mode
export async function getFamily(familyId: string) {
  return apiService.makeRequest<{ id: string; name: string; setup_state?: string; setup_step?: string }>(
    `/families/${familyId}`
  );
}

export async function patchFamilyName(familyId: string, name: string) {
  return apiService.makeRequest<{ id: string; name: string }>(`/families/${familyId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function listMembers(familyId: string) {
  return apiService.makeRequest<Array<{
    id: string; family_id: string; name: string; role: "parent" | "child";
    age: number | null; color: string; avatar_url: string | null; 
    avatar_style: string | null; avatar_seed: string | null; 
    avatar_options: Record<string, any> | null; user_id: string | null;
  }>>(`/family-members?family_id=${encodeURIComponent(familyId)}`);
}

export async function createMember(m: {
  family_id: string; name: string; role: "parent" | "child"; age?: number | null;
  color?: "blue"|"green"|"yellow"|"orange"|"purple"|"pink"|"teal"|"indigo"; 
  avatar_url?: string | null; 
  avatar_style?: string;
  avatar_seed?: string;
  avatar_options?: Record<string, any>;
  user_id?: string | null;
}) {
  return apiService.makeRequest(`/family-members`, { method: "POST", body: JSON.stringify(m) });
}

export async function deleteMember(memberId: string) {
  return apiService.makeRequest(`/family-members/${memberId}`, { method: "DELETE" });
}

// Library
export async function listLibraryTasks(query?: string) {
  const q = query ? `?q=${encodeURIComponent(query)}` : "";
  return apiService.makeRequest<Array<{
    id: string;
    name: string;
    description: string | null;
    default_points: number;
    default_duration_mins: number | null;
    default_time_of_day: string | null;
    category: string | null;
    tags: string[] | null;
    icon: string | null;
    color: string | null;
    is_system: boolean;
    is_public: boolean;
  }>>(`/library/tasks${q}`);
}

export async function createLibraryTask(payload: {
  name: string;
  description?: string;
  default_points: number;
  default_duration_mins?: number;
  category?: string;
  tags?: string[];
  icon?: string;
  color?: string;
  is_public?: boolean;
}) {
  return apiService.makeRequest<{
    id: string;
    name: string;
    description: string | null;
    default_points: number;
    default_duration_mins: number | null;
    default_time_of_day: string | null;
    category: string | null;
    tags: string[] | null;
    icon: string | null;
    color: string | null;
    is_system: boolean;
    is_public: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
  }>(`/library/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listLibraryGroups(query?: string, includeItems = true) {
  const qs = new URLSearchParams();
  if (query) qs.set("q", query);
  if (!includeItems) qs.set("include_items", "false");
  const s = qs.toString();
  return apiService.makeRequest<Array<{
    id: string;
    name: string;
    description: string | null;
    default_time_of_day: string | null;
    icon: string | null;
    color: string | null;
    is_system: boolean;
    is_public: boolean;
    items?: Array<{
      task_id: string;
      name: string;
      description: string | null;
      default_points: number;
      order_index: number;
    }>;
  }>>(`/library/groups${s ? `?${s}` : ""}`);
}

export async function createLibraryGroup(payload: {
  name: string;
  description?: string;
  default_time_of_day?: string;
  icon?: string;
  color?: string;
  is_public?: boolean;
}) {
  return apiService.makeRequest<{
    id: string;
    name: string;
    description: string | null;
    default_time_of_day: string | null;
    icon: string | null;
    color: string | null;
    is_system: boolean;
    is_public: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
  }>(`/library/groups`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Routine draft lifecycle
export async function createRoutineDraft(familyId: string, name: string) {
  return apiService.makeRequest<{
    id: string;
    family_id: string;
    name: string;
    status: string;
    source: string;
  }>(`/routines`, {
    method: "POST",
    body: JSON.stringify({ family_id: familyId, name, source: "scratch" }),
  });
}

export async function patchRoutine(routineId: string, body: { name?: string; status?: "draft"|"active"|"archived" }) {
  return apiService.makeRequest<{
    id: string;
    family_id: string;
    name: string;
    status: string;
    source: string;
  }>(`/routines/${routineId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function getOnboardingRoutine(familyId: string) {
  // Use a custom request for onboarding routine to avoid logging 404s
  const url = `${API_BASE_URL}/routines/onboarding/${familyId}`;
  const headers = await apiService.getAuthHeaders();
  
  const response = await fetch(url, {
    method: "GET",
    headers,
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      // Don't log 404s for onboarding routine - this is expected
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    // For other errors, log them
    const errorData = await response.json().catch(() => ({}));
    console.error('Response error:', errorData);
    console.error('Response status:', response.status);
    throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
  }
  
  const responseData = await response.json();
  return responseData;
}

export async function getRoutineGroups(routineId: string) {
  return apiService.makeRequest<{
    id: string;
    routine_id: string;
    name: string;
    time_of_day: string | null;
    order_index: number;
  }[]>(`/routines/${routineId}/groups`, {
    method: "GET",
  });
}

export async function getRoutineTasks(routineId: string) {
  return apiService.makeRequest<{
    id: string;
    routine_id: string;
    group_id: string | null;
    name: string;
    description: string | null;
    points: number;
    duration_mins: number | null;
    time_of_day: string | null;
    frequency: string;
    days_of_week: string[];
    order_index: number;
  }[]>(`/routines/${routineId}/tasks`, {
    method: "GET",
  });
}

// Task Assignment endpoints
export async function createTaskAssignment(routineId: string, taskId: string, memberId: string, orderIndex?: number) {
  return apiService.makeRequest<{
    id: string;
    routine_task_id: string;
    member_id: string;
    order_index: number;
  }>(`/routines/${routineId}/tasks/${taskId}/assignments`, {
    method: "POST",
    body: JSON.stringify({
      routine_task_id: taskId,
      member_id: memberId,
      order_index: orderIndex
    }),
  });
}

export async function getRoutineAssignments(routineId: string) {
  return apiService.makeRequest<{
    id: string;
    routine_task_id: string;
    member_id: string;
    order_index: number;
  }[]>(`/routines/${routineId}/assignments`, {
    method: "GET",
  });
}

export async function deleteTaskAssignment(routineId: string, taskId: string, assignmentId: string) {
  return apiService.makeRequest(`/routines/${routineId}/tasks/${taskId}/assignments/${assignmentId}`, {
    method: "DELETE",
  });
}

// Bulk task creation
export async function bulkCreateIndividualTasks(routineId: string, payload: {
  task_template: {
    name: string;
    description?: string;
    points: number;
    duration_mins?: number;
    time_of_day?: "morning"|"afternoon"|"evening"|"night";
    from_task_template_id?: string;
  };
  assignments: Array<{
    member_id: string;
    days_of_week: string[];
    order_index?: number;
  }>;
  create_recurring_template?: boolean;
  existing_recurring_template_id?: string;
}) {
  return apiService.makeRequest<{
    routine_id: string;
    tasks_created: number;
    assignments_created: number;
    members_assigned: string[];
    days_assigned: string[];
    created_tasks: Array<{
      id: string;
      routine_id: string;
      group_id: string | null;
      name: string;
      description: string | null;
      points: number;
      duration_mins: number | null;
      time_of_day: string | null;
      frequency: string;
      days_of_week: string[];
      order_index: number;
    }>;
  }>(`/routines/${routineId}/tasks/bulk-assign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Bulk task deletion
export async function bulkDeleteTasks(routineId: string, payload: {
  recurring_template_id?: string;
  task_template_id?: string;
  delete_scope: "this_day" | "this_and_following" | "all_days";
  target_day?: string;
  member_id?: string;
}) {
  return apiService.makeRequest<{
    routine_id: string;
    tasks_deleted: number;
    assignments_deleted: number;
    days_affected: string[];
    message: string;
    cleaned_templates: string[];
  }>(`/routines/${routineId}/tasks/bulk-delete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Groups & tasks within routine
export async function addRoutineGroup(routineId: string, payload: { name?: string; time_of_day?: "morning"|"afternoon"|"evening"|"night"; from_group_template_id?: string; order_index?: number }) {
  return apiService.makeRequest<{
    id: string;
    routine_id: string;
    name: string;
    time_of_day: string | null;
    order_index: number;
  }>(`/routines/${routineId}/groups`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function addRoutineTask(routineId: string, payload: {
  group_id?: string;
  from_task_template_id?: string;
  name?: string;
  description?: string;
  points?: number;
  duration_mins?: number|null;
  time_of_day?: "morning"|"afternoon"|"evening"|"night";
  frequency?: "daily"|"weekly"|"monthly"|"weekends";
  days_of_week?: string[];
  order_index?: number;
}) {
  return apiService.makeRequest<{
    id: string;
    routine_id: string;
    group_id: string | null;
    name: string;
    description: string | null;
    points: number;
    duration_mins: number | null;
    time_of_day: string | null;
    frequency: string;
    days_of_week: string[];
    order_index: number;
  }>(`/routines/${routineId}/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteRoutineGroup(routineId: string, groupId: string) {
  return apiService.makeRequest(`/routines/${routineId}/groups/${groupId}`, { method: "DELETE" });
}

export async function deleteRoutineTask(routineId: string, taskId: string) {
  return apiService.makeRequest(`/routines/${routineId}/tasks/${taskId}`, { method: "DELETE" });
}

export async function patchRoutineTask(routineId: string, taskId: string, payload: {
  name?: string;
  description?: string;
  points?: number;
  duration_mins?: number;
  time_of_day?: string;
  days_of_week?: string[];
}) {
  return apiService.makeRequest(`/routines/${routineId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// Onboarding step tracking (already exists; keep signature)
export async function updateOnboardingStep(familyId: string, step: string) {
  return apiService.makeRequest<{
    id: string;
    name: string;
    setup_state: string;
    setup_step: string | null;
    subscription_plan: string | null;
    trial_start: string | null;
    trial_end: string | null;
  }>(`/onboarding/step`, {
    method: "POST",
    body: JSON.stringify({ family_id: familyId, step }),
  });
}

// Routine Schedule Management
export async function createRoutineSchedule(routineId: string, scheduleData: {
  scope: 'everyday' | 'weekdays' | 'weekends' | 'custom';
  days_of_week: string[];
  start_date?: Date;
  end_date?: Date;
  timezone: string;
  is_active: boolean;
}) {
  const payload = {
    scope: scheduleData.scope,
    days_of_week: scheduleData.days_of_week || [],
    start_date: scheduleData.start_date?.toISOString().split('T')[0] || null,
    end_date: scheduleData.end_date?.toISOString().split('T')[0] || null,
    timezone: scheduleData.timezone,
    is_active: scheduleData.is_active,
  };
  
  console.log('Creating routine schedule:', {
    routineId,
    payload,
    url: `/routines/${routineId}/schedules`
  });
  
  return apiService.makeRequest<{
    id: string;
    routine_id: string;
    scope: string;
    days_of_week: string[];
    start_date: string | null;
    end_date: string | null;
    timezone: string;
    is_active: boolean;
    created_at: string;
  }>(`/routines/${routineId}/schedules`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Get routine schedules
export async function getRoutineSchedules(routineId: string) {
  console.log('Getting routine schedules for routine:', routineId);
  
  return apiService.makeRequest<{
    id: string;
    routine_id: string;
    scope: string;
    days_of_week: string[];
    start_date: string | null;
    end_date: string | null;
    timezone: string;
    is_active: boolean;
    created_at: string;
  }[]>(`/routines/${routineId}/schedules`, {
    method: "GET",
  });
}

// Task Instance Generation
export async function generateTaskInstances(familyId: string, dateRange: {
  start_date: Date;
  end_date: Date;
}) {
  return apiService.makeRequest<{
    message: string;
    instances_created: number;
    date_range: string;
  }>(`/families/${familyId}/generate-instances`, {
    method: "POST",
    body: JSON.stringify({
      start_date: dateRange.start_date.toISOString().split('T')[0],
      end_date: dateRange.end_date.toISOString().split('T')[0],
    }),
  });
}

// New Group Assignment Functions
export async function assignGroupTemplateToMembers(routineId: string, groupTemplateId: string, payload: {
  member_ids: string[];
  days_of_week: string[];
  selected_task_ids?: string[];
  time_of_day?: "morning" | "afternoon" | "evening" | "night";
}) {
  return apiService.makeRequest<{
    group_id: string;
    tasks_created: number;
    assignments_created: number;
    members_assigned: string[];
    days_assigned: string[];
  }>(`/routines/${routineId}/groups/${groupTemplateId}/assign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function assignExistingGroupToMembers(routineId: string, groupId: string, payload: {
  member_ids: string[];
  days_of_week: string[];
  selected_task_ids?: string[];
  time_of_day?: "morning" | "afternoon" | "evening" | "night";
}) {
  return apiService.makeRequest<{
    group_id: string;
    tasks_created: number;
    assignments_created: number;
    members_assigned: string[];
    days_assigned: string[];
  }>(`/routines/${routineId}/groups/${groupId}/assign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getRoutineFullData(routineId: string) {
  return apiService.makeRequest<{
    routine: {
      id: string;
      family_id: string;
      name: string;
      status: string;
      source: string;
    };
    groups: Array<{
      id: string;
      routine_id: string;
      name: string;
      time_of_day: string | null;
      order_index: number;
      tasks: Array<{
        id: string;
        routine_id: string;
        group_id: string | null;
        name: string;
        description: string | null;
        points: number;
        duration_mins: number | null;
        time_of_day: string | null;
        frequency: string;
        days_of_week: string[];
        order_index: number;
        recurring_template_id: string | null;
        assignments: Array<{
          id: string;
          routine_task_id: string;
          member_id: string;
          order_index: number;
        }>;
      }>;
    }>;
    individual_tasks: Array<{
      id: string;
      routine_id: string;
      group_id: string | null;
      name: string;
      description: string | null;
      points: number;
      duration_mins: number | null;
      time_of_day: string | null;
      frequency: string;
      days_of_week: string[];
      order_index: number;
      recurring_template_id: string | null;
      assignments: Array<{
        id: string;
        routine_task_id: string;
        member_id: string;
        order_index: number;
      }>;
    }>;
    schedules: Array<{
      id: string;
      routine_id: string;
      scope: string;
      days_of_week: string[];
      start_date: string | null;
      end_date: string | null;
      timezone: string;
      is_active: boolean;
      created_at: string;
    }>;
    day_orders: DaySpecificOrder[];
  }>(`/routines/${routineId}/full-data`, {
    method: "GET",
  });
}

// Day-specific order management functions
export async function getRoutineDayOrders(routineId: string): Promise<DaySpecificOrder[]> {
  return apiService.makeRequest<DaySpecificOrder[]>(`/routines/${routineId}/day-orders`, {
    method: "GET",
  });
}

export async function createDaySpecificOrder(routineId: string, order: DaySpecificOrderCreate): Promise<DaySpecificOrder> {
  return apiService.makeRequest<DaySpecificOrder>(`/routines/${routineId}/day-orders`, {
    method: "POST",
    body: JSON.stringify(order),
  });
}

export async function updateDaySpecificOrder(routineId: string, orderId: string, orderIndex: number): Promise<DaySpecificOrder> {
  return apiService.makeRequest<DaySpecificOrder>(`/routines/${routineId}/day-orders/${orderId}`, {
    method: "PUT",
    body: JSON.stringify({ order_index: orderIndex }),
  });
}

export async function deleteDaySpecificOrder(routineId: string, orderId: string): Promise<void> {
  return apiService.makeRequest<void>(`/routines/${routineId}/day-orders/${orderId}`, {
    method: "DELETE",
  });
}

export async function bulkUpdateDayOrders(routineId: string, update: BulkDayOrderUpdate): Promise<DaySpecificOrder[]> {
  return apiService.makeRequest<DaySpecificOrder[]>(`/routines/${routineId}/day-orders/bulk`, {
    method: "POST",
    body: JSON.stringify(update),
  });
}

export async function copyDayOrders(routineId: string, request: CopyDayOrdersRequest): Promise<DaySpecificOrder[]> {
  return apiService.makeRequest<DaySpecificOrder[]>(`/routines/${routineId}/day-orders/copy`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

// Bulk Recurring Task Update
export async function bulkUpdateRecurringTasks(routineId: string, update: {
  recurring_template_id: string;
  task_template: {
    name: string;
    description?: string;
    points: number;
    duration_mins: number;
    time_of_day?: string;
    from_task_template_id?: string;
  };
  assignments: Array<{
    member_id: string;
    days_of_week: string[];
    order_index?: number;
  }>;
  new_days_of_week: string[];
}): Promise<{
  routine_id: string;
  recurring_template_id: string;
  tasks_created: number;
  tasks_updated: number;
  tasks_deleted: number;
  assignments_created: number;
  members_assigned: string[];
  days_assigned: string[];
  updated_tasks: Array<{
    id: string;
    routine_id: string;
    group_id: string | null;
    name: string;
    description: string | null;
    points: number;
    duration_mins: number | null;
    time_of_day: string | null;
    frequency: string;
    days_of_week: string[];
    order_index: number;
    recurring_template_id: string | null;
    assignments: Array<{
      id: string;
      routine_task_id: string;
      member_id: string;
      order_index: number;
    }>;
  }>;
}> {
  return apiService.makeRequest(`/routines/${routineId}/tasks/bulk-update-recurring`, {
    method: "POST",
    body: JSON.stringify(update),
  });
}
