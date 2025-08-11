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
        
        // Check if the session has a valid access token
        if (!session.access_token) {
          console.log('No access token in session, redirecting to signin')
          router.push("/signin")
          return
        }
        
        console.log('Access token found, length:', session.access_token.length)
        
        const currentUser = await auth.getCurrentUser()
        console.log('Current user:', currentUser)
        setUser(currentUser)

        if (!currentUser) {
          console.log('No user found, redirecting to signin')
          router.push("/signin")
          return
        }

        // Double-check that we have a valid session with access token
        const currentSession = await auth.getSession()
        if (!currentSession || !currentSession.access_token) {
          console.log('Session expired or invalid, redirecting to signin')
          router.push("/signin")
          return
        }

        console.log('User authenticated and session valid, proceeding with onboarding check...')
        
        // Test authentication by making a simple API call
        try {
          console.log('Testing authentication with API call...')
          const testResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/families/`, {
            headers: {
              'Authorization': `Bearer ${currentSession.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          console.log('Test API response status:', testResponse.status)
          
          if (testResponse.status === 401) {
            console.log('Authentication failed, redirecting to signin')
            router.push("/signin")
            return
          }
          
          console.log('Authentication test successful')
        } catch (error) {
          console.error('Authentication test failed:', error)
          router.push("/signin")
          return
        }
        
        console.log('User found, checking onboarding status...')
        
        // Test database connection first
        console.log('Testing database connection...')
        const connectionTest = await storage.testConnection()
        console.log('Connection test result:', connectionTest)
        
        if (!connectionTest.success) {
          console.error('Database connection failed:', connectionTest.error)
          // Could show an error message to the user
        }
        
        // Check if user already has a family (created by them)
        console.log('Checking if user already has a family...')
        const existingFamily = await storage.checkUserHasFamily(currentUser.id)
        console.log('Existing family check:', existingFamily)
        
        if (existingFamily) {
          console.log('User already has a family, checking if they need to complete onboarding...')
          
          // Check if onboarding is already completed from Supabase
          const onboardingStatus = await storage.checkOnboardingStatus(currentUser.id)
          console.log('Onboarding status:', onboardingStatus)
          
          if (!onboardingStatus.needsOnboarding) {
            console.log('Onboarding completed, redirecting to dashboard')
            router.push("/dashboard")
            return
          }
          
          // User has family but onboarding not complete, continue with onboarding
          console.log('User has family but onboarding not complete, showing onboarding wizard')
          setLoading(false)
          return
        }
        
        // User has no family, check if onboarding is already completed from Supabase
        const onboardingStatus = await storage.checkOnboardingStatus(currentUser.id)
        console.log('Onboarding status:', onboardingStatus)
        
        if (!onboardingStatus.needsOnboarding) {
          console.log('Onboarding completed, redirecting to dashboard')
          router.push("/dashboard")
          return
        }

        if (onboardingStatus.authError) {
          console.error('Authentication error detected, user may need to sign in again')
          // Could redirect to signin or show an error message
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