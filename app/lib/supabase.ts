import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      families: {
        Row: {
          id: string
          name: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
        }
        Update: {
          name?: string
        }
      }
      family_members: {
        Row: {
          id: string
          family_id: string
          name: string
          role: "parent" | "child"
          calm_mode: boolean
          text_to_speech: boolean
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          name: string
          role: "parent" | "child"
          calm_mode?: boolean
          text_to_speech?: boolean
        }
        Update: {
          name?: string
          calm_mode?: boolean
          text_to_speech?: boolean
        }
      }
      chores: {
        Row: {
          id: string
          family_id: string
          title: string
          description?: string
          frequency: "daily" | "weekly" | "weekends"
          assigned_to: string
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          title: string
          description?: string
          frequency: "daily" | "weekly" | "weekends"
          assigned_to: string
          completed?: boolean
        }
        Update: {
          title?: string
          description?: string
          completed?: boolean
        }
      }
      activities: {
        Row: {
          id: string
          family_id: string
          title: string
          description?: string
          scheduled_date: string
          depends_on_chores: boolean
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          title: string
          description?: string
          scheduled_date: string
          depends_on_chores?: boolean
        }
        Update: {
          title?: string
          description?: string
          scheduled_date?: string
        }
      }
      rewards: {
        Row: {
          id: string
          family_id: string
          title: string
          description?: string
          threshold: number
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          title: string
          description?: string
          threshold: number
        }
        Update: {
          title?: string
          description?: string
          threshold?: number
        }
      }
    }
  }
} 