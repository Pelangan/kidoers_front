"use client"

import { useState, useEffect } from "react"
import { auth } from "../lib/supabase"
import { storage } from "../lib/storage"
import type { User } from "@supabase/supabase-js"

import SignUp from "../components/auth/SignUp"
import AuthLayout from "../components/layout/AuthLayout"
import { useRouter } from "next/navigation"

export default function SignUpPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for existing user
    const checkUser = async () => {
      const currentUser = await auth.getCurrentUser()
      setUser(currentUser)
      setLoading(false)
    }
    checkUser()
  }, [])

  // Handle navigation when user exists
  useEffect(() => {
    if (user && !loading) {
      console.log("User authenticated:", user.email)
      
      // Check if we've already navigated in this session
      const hasNavigatedThisSession = sessionStorage.getItem('hasNavigatedToOnboarding')
      
      if (!hasNavigatedThisSession) {
        console.log("Redirecting to onboarding")
        sessionStorage.setItem('hasNavigatedToOnboarding', 'true')
        router.push("/onboarding")
      }
    }
  }, [user, loading, router])

  const handleSignUp = (user: User) => {
    setUser(user)
    router.push("/onboarding")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <AuthLayout>
      <SignUp onSignUp={handleSignUp} />
    </AuthLayout>
  )
} 