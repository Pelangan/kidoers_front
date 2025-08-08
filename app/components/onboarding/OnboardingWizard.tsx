"use client"

import { useState } from "react"
import { storage } from "../../lib/storage"
import CreateFamily from "./steps/CreateFamily"
import AddChores from "./steps/AddChores"
import AddActivities from "./steps/AddActivities"
import AddRewards from "./steps/AddRewards"

export type FamilyMember = {
  id: string
  name: string
  role: "parent" | "child"
  color: string
  age?: number
  avatar_url?: string
  calmMode: boolean
  textToSpeech: boolean
}

export type Chore = {
  id: string
  title: string
  description: string
  frequency: "daily" | "weekly" | "weekends"
  timeOfDay: "morning" | "afternoon" | "evening"
  category?: string
  assignedTo: string
  points: number
  completed: boolean
}

export type Activity = {
  id: string
  title: string
  description: string
  location?: string
  time?: string
  duration?: number
  frequency?: "daily" | "weekly" | "monthly"
  daysOfWeek?: string[]
  icon?: string
  assignedTo?: string
  completed: boolean
  scheduled_date?: string
  depends_on_chores?: boolean
}

export type Reward = {
  id: string
  title: string
  description: string
  type: "complete_tasks" | "complete_categories" | "complete_time_slots" | "specific_tasks" | "streak" | "mixed"
  conditions: any
  icon: string
  availableTo: string
  threshold?: number
}

interface OnboardingWizardProps {
  onComplete: () => void
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [familyName, setFamilyName] = useState("")
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])

  const totalSteps = 4

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      // Complete onboarding - save all data to localStorage
      const family = {
        id: Date.now().toString(),
        name: familyName,
        createdAt: new Date().toISOString(),
      }

      storage.setFamily(family)
      storage.setMembers(members)
      storage.setChores(chores)
      storage.setActivities(activities)
      storage.setRewards(rewards)
      
      // Clear the force onboarding flag
      storage.setForceOnboarding(false)

      onComplete()
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <CreateFamily
            familyName={familyName}
            setFamilyName={setFamilyName}
            members={members}
            setMembers={setMembers}
            onNext={nextStep}
          />
        )
      case 2:
        return (
          <AddChores
            chores={chores}
            setChores={setChores}
            members={members}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 3:
        return (
          <AddActivities
            activities={activities}
            setActivities={setActivities}
            members={members}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 4:
        return (
          <AddRewards
            rewards={rewards}
            setRewards={setRewards}
            members={members}
            chores={chores}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      default:
        return null
    }
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
          {renderStep()}
        </div>
      </div>
    </div>
  )
}
