"use client"

import { useState, useEffect } from "react"
import { getCurrentUser } from "../lib/auth"
import { storage } from "../lib/storage"
import type { User } from "../lib/auth"

import SignUp from "../components/auth/SignUp"
import AuthLayout from "../components/layout/AuthLayout"
import { useRouter } from "next/navigation"

export default function SignUpPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for existing user
    const currentUser = getCurrentUser()
    setUser(currentUser)

    setLoading(false)
  }, [])

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
    const family = storage.getFamily()
    if (family) {
      router.push("/dashboard")
      return null
    } else {
      router.push("/onboarding")
      return null
    }
  }

  return (
    <AuthLayout>
      <SignUp onSignUp={handleSignUp} />
    </AuthLayout>
  )
} 