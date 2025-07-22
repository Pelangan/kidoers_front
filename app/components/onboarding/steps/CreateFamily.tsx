"use client"

import type React from "react"
import { useState } from "react"
import { Users, Calendar, Gift, Sparkles } from "lucide-react"

interface CreateFamilyProps {
  familyName: string
  setFamilyName: (name: string) => void
  onNext: () => void
}

export default function CreateFamily({ familyName, setFamilyName, onNext }: CreateFamilyProps) {
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!familyName.trim()) {
      setError("Please enter a family name")
      return
    }
    setError("")
    onNext()
  }

  const features = [
    {
      icon: Users,
      title: "Add Family Members",
      description: "Include everyone and set personalized preferences",
      color: "bg-blue-100 text-blue-600",
    },
    {
      icon: Sparkles,
      title: "Create Collaborative Tasks",
      description: "Build tasks everyone can contribute to",
      color: "bg-purple-100 text-purple-600",
    },
    {
      icon: Gift,
      title: "Unlock Family Rewards",
      description: "Earn real-life rewards like pizza nights together",
      color: "bg-green-100 text-green-600",
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "See all your family tasks in a beautiful calendar",
      color: "bg-orange-100 text-orange-600",
    },
  ]

  return (
    <div className="text-center">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Let's create your family's collaborative task space and start building better routines together
        </h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <div className="w-8 h-1 bg-primary rounded-full" />
          <div className="w-2 h-1 bg-muted rounded-full" />
          <span className="text-sm">Step 1 of 1</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Left Column - Form */}
        <div className="card text-left">
          <h2 className="text-xl font-bold mb-2">Create Your Family</h2>
          <p className="text-muted-foreground mb-6">Give your family circle a name to get started</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="familyName" className="block text-sm font-medium mb-2">
                Family Name
              </label>
              <input
                id="familyName"
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Enter your family name"
                className="input"
                autoFocus
              />
              {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            </div>

            <button type="submit" className="btn-primary w-full">
              Continue →
            </button>
          </form>
        </div>

        {/* Right Column - Features Preview */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">What's coming next?</h3>
          <p className="text-muted-foreground mb-6">Here's what you'll be able to do with Kidoers:</p>

          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-card/50">
              <div className={`p-2 rounded-lg ${feature.color}`}>
                <feature.icon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
