"use client"

import { useState } from "react"
import { storage } from "../../lib/storage"
import CreateFamily from "./steps/CreateFamily"

export type FamilyMember = {
  id: string
  name: string
  role: "parent" | "child"
  calmMode: boolean
  textToSpeech: boolean
}

export type Chore = {
  id: string
  title: string
  description: string
  frequency: "daily" | "weekly" | "weekends"
  assignedTo: string
  completed: boolean
}

export type Reward = {
  id: string
  title: string
  description: string
  threshold: number
}

interface OnboardingWizardProps {
  onComplete: () => void
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [familyName, setFamilyName] = useState("")
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])

  const totalSteps = 1 // Simplified for preview

  const nextStep = () => {
    // Complete onboarding - save all data to localStorage
    const family = {
      id: Date.now().toString(),
      name: familyName,
      createdAt: new Date().toISOString(),
    }

    storage.setFamily(family)
    storage.setMembers(members)
    storage.setChores(chores)
    storage.setRewards(rewards)

    onComplete()
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round((currentStep / totalSteps) * 100)}% complete
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-gradient-warm h-2 rounded-full transition-all duration-500 ease-smooth"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-2xl mx-auto">
          <CreateFamily familyName={familyName} setFamilyName={setFamilyName} onNext={nextStep} />
        </div>
      </div>
    </div>
  )
}
