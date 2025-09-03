"use client"

import { useState, useEffect } from "react"
import { auth } from "../lib/supabase"
import { apiService } from "../lib/api"
import type { User } from "@supabase/supabase-js"
import Dashboard from "../components/dashboard/Dashboard"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for existing user
    const checkUser = async () => {
      try {
        const currentUser = await auth.getCurrentUser()
        setUser(currentUser)

        if (!currentUser) {
          router.push("/signin")
          return
        }

        // Check if onboarding is completed using API
        const onboardingStatus = await apiService.getOnboardingStatus()
        
        // If no family exists, go to onboarding
        if (!onboardingStatus.has_family) {
          router.push("/onboarding")
          return
        }
        
        // If there's an in-progress family that's not complete, go to onboarding
        if (onboardingStatus.in_progress && onboardingStatus.in_progress.setup_state !== 'complete') {
          router.push("/onboarding")
          return
        }
        
        // If we have a family and no in-progress family (or in-progress is complete), stay on dashboard

        setLoading(false)
      } catch (error) {
        console.error("Error checking user:", error)
        router.push("/signin")
      }
    }
    
    checkUser()
  }, [router])

  const handleSignOut = async () => {
    try {
      await auth.signOut()
      setUser(null)
      router.push("/signin")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <Dashboard onSignOut={handleSignOut} />
} 