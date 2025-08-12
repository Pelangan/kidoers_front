"use client"

import { useState, useEffect } from "react"
import { auth } from "../lib/supabase"
import { storage } from "../lib/storage"
import type { User } from "@supabase/supabase-js"
import OnboardingWizard from "../components/onboarding/OnboardingWizard"
import { useRouter } from "next/navigation"

export default function OnboardingPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for existing user
    const checkUser = async () => {
      try {
        console.log('Checking for existing user...')
        
        // Check for active session first
        const session = await auth.getSession()
        console.log('Current session:', session)
        
        if (!session) {
          console.log('No active session found, redirecting to signin')
          router.push("/signin")
          return
        }
        
        // Check if the session has a user
        if (!session.user) {
          console.log('Session found but no user, redirecting to signin')
          router.push("/signin")
          return
        }
        
        console.log('Session user:', session.user)
        setUser(session.user)

        // Check if user already has a family in localStorage
        const existingFamily = localStorage.getItem("kidoers_family")
        const existingMembers = localStorage.getItem("kidoers_members")
        
        if (existingFamily && existingMembers) {
          const familyData = JSON.parse(existingFamily)
          const membersData = JSON.parse(existingMembers)
          
          if (familyData.id && membersData.length > 0) {
            // User already has a family, check if onboarding is complete
            if (familyData.onboarding_status === 'completed') {
              console.log('Onboarding already completed, redirecting to dashboard')
              router.push("/dashboard")
              return
            }
          }
        }

        console.log('User needs onboarding, showing onboarding wizard')
        setLoading(false)
      } catch (error) {
        console.error("Error checking user:", error)
        router.push("/signin")
      }
    }
    checkUser()
  }, [router])

  const handleOnboardingComplete = () => {
    router.push("/dashboard")
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

  return <OnboardingWizard onComplete={handleOnboardingComplete} />
} 