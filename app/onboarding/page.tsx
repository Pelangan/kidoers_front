"use client"

import { useState, useEffect } from "react"
import { getCurrentUser } from "../lib/auth"
import { storage } from "../lib/storage"
import type { User } from "../lib/auth"
import OnboardingWizard from "../components/onboarding/OnboardingWizard"
import { useRouter } from "next/navigation"

export default function OnboardingPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for existing user
    const currentUser = getCurrentUser()
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