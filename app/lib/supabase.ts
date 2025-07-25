import { createClient } from '@supabase/supabase-js'

// Environment variables - you'll need to add these to your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Auth helper functions
export const auth = {
  // Sign up with email and password
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { user: data.user, error: error?.message }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { user: data.user, error: error?.message }
  },

  // Sign in with Google OAuth
  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { url: data.url, error: error?.message }
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error: error?.message }
  },

  // Get current user
  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Get current session
  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  // Listen to auth state changes
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  },

  // Reset password
  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    return { error: error?.message }
  },

  // Update password
  updatePassword: async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password
    })
    return { error: error?.message }
  }
}

// User profile interface
export interface UserProfile {
  id: string
  email: string
  name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

// Database helper functions
export const db = {
  // Get user profile
  getUserProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return { profile: data, error: error?.message }
  },

  // Update user profile
  updateUserProfile: async (userId: string, updates: Partial<UserProfile>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    return { profile: data, error: error?.message }
  },

  // Create user profile
  createUserProfile: async (profile: Omit<UserProfile, 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert([profile])
      .select()
      .single()
    return { profile: data, error: error?.message }
  }
} 