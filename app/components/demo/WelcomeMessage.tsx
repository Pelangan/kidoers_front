"use client"

import { useState } from "react"
import { X, Sparkles, Users, CheckSquare, Gift, Calendar } from "lucide-react"

export default function WelcomeMessage() {
  const [isVisible, setIsVisible] = useState(!localStorage.getItem("kidoers_welcome_dismissed"))

  const handleDismiss = () => {
    localStorage.setItem("kidoers_welcome_dismissed", "true")
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="bg-gradient-warm p-6 rounded-lg shadow-soft text-white mb-6 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white/20 rounded-lg">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Welcome to Kidoers!</h2>
          <p className="text-white/90">Your demo family is ready to explore</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="text-sm">The Johnson Family (4 members)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            <span className="text-sm">12 sample chores (7 completed)</span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">6 upcoming activities</span>
          </div>
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            <span className="text-sm">5 family rewards to unlock</span>
          </div>
        </div>
      </div>

      <div className="bg-white/10 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Try these features:</h3>
        <ul className="text-sm space-y-1 text-white/90">
          <li>• Toggle chores as complete/incomplete</li>
          <li>• Check the calendar for upcoming activities</li>
          <li>• See which rewards are earned (Extra Screen Time is ready!)</li>
          <li>• Use "Demo Tools" in the header to reset or export data</li>
        </ul>
      </div>
    </div>
  )
} 