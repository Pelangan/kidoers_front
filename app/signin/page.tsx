"use client"

import { useState, useEffect } from "react"
import { auth } from "../lib/supabase"
import { storage } from "../lib/storage"
import type { User } from "@supabase/supabase-js"

import SignIn from "../components/auth/SignIn"
import AuthLayout from "../components/layout/AuthLayout"
import { useRouter } from "next/navigation"

export default function SignInPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for existing user
    const checkUser = async () => {
      try {
        console.log("Checking for existing user...")
        const currentUser = await auth.getCurrentUser()
        console.log("Current user:", currentUser)
        setUser(currentUser)
        setLoading(false)
        
        // If no user, clear the navigation flag
        if (!currentUser) {
          sessionStorage.removeItem('hasNavigatedToOnboarding')
        }
      } catch (error) {
        console.error("Error checking user:", error)
        setLoading(false)
      }
    }
    checkUser()
  }, [])

  // Handle navigation when user exists
  useEffect(() => {
    if (user && !loading) {
      console.log("User authenticated:", user.email)
      console.log("Redirecting to onboarding")
      router.push("/onboarding")
    }
  }, [user, loading, router])

  const handleSignIn = (user: User) => {
    setUser(user)
    const family = storage.getFamily()
    if (family) {
      router.push("/dashboard")
    } else {
      router.push("/onboarding")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Don't render anything if user is authenticated - let the redirect happen
  if (user) {
    return null
  }

  return (
    <AuthLayout>
      <SignIn onSignIn={handleSignIn} />
    </AuthLayout>
  )
} 