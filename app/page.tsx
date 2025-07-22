"use client"

import { useEffect } from "react"
import { getCurrentUser } from "./lib/auth"
import { storage } from "./lib/storage"
import { shouldLoadDemoData, loadDemoData } from "./lib/demoData"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Load demo data if no data exists
    if (shouldLoadDemoData()) {
      loadDemoData()
    }

    // Check for existing user and redirect accordingly
    const currentUser = getCurrentUser()
    if (currentUser) {
      const family = storage.getFamily()
      if (family) {
        router.push("/dashboard")
      } else {
        router.push("/onboarding")
      }
    } else {
      router.push("/signin")
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )
}
