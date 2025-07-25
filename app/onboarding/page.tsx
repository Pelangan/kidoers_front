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
        const currentUser = await auth.getCurrentUser()
        setUser(currentUser)

        if (!currentUser) {
          router.push("/signin")
          return
        }

        // Check if onboarding is already completed
        const family = storage.getFamily()
        if (family) {
          router.push("/dashboard")
          return
        }

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