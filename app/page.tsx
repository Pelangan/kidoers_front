"use client"

import { useEffect, useState } from "react"
import { auth } from "./lib/supabase"
import { storage } from "./lib/storage"
import { apiService } from "./lib/api"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing user and redirect accordingly
    const checkUser = async () => {
      try {
        const currentUser = await auth.getCurrentUser()
        if (currentUser) {
          // Check onboarding status from backend API
          try {
            const onboardingStatus = await apiService.getOnboardingStatus()
            
            if (!onboardingStatus.has_family || onboardingStatus.in_progress) {
              router.push("/onboarding")
            } else {
              router.push("/dashboard")
            }
          } catch (error) {
            console.error("Error checking onboarding status:", error)
            // Fallback to localStorage check
            const localOnboardingStatus = storage.checkOnboardingStatus()
            if (localOnboardingStatus.needsOnboarding) {
              router.push("/onboarding")
            } else {
              router.push("/dashboard")
            }
          }
        } else {
          router.push("/signin")
        }
      } catch (error) {
        console.error("Error checking user:", error)
        router.push("/signin")
      } finally {
        setLoading(false)
      }
    }
    
    checkUser()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return null
}
