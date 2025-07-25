"use client"

import { useEffect } from "react"
import { auth } from "./lib/supabase"
import { storage } from "./lib/storage"

import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check for existing user and redirect accordingly
    const checkUser = async () => {
      const currentUser = await auth.getCurrentUser()
      if (currentUser) {
        // For now, always redirect to onboarding since we're using Supabase
        // and don't have family data in localStorage yet
        router.push("/onboarding")
      } else {
        router.push("/signin")
      }
    }
    checkUser()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )
}
