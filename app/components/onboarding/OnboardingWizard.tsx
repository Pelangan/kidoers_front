"use client"

import { useState, useEffect } from "react"
import { auth } from "../../lib/supabase"
import CreateFamilyStep from "./steps/CreateFamilyStep"
import CreateRoutineStep from "./steps/CreateRoutineStep"
import { useRouter } from "next/navigation"

export type FamilyMember = {
  id: string
  name: string
  role: "parent" | "child"
  color: string
  age?: number | null
  avatar_url?: string
}

interface OnboardingWizardProps {
  onComplete: () => void
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const totalSteps = 2

  // Check for existing onboarding progress when component mounts
  useEffect(() => {
    const checkExistingProgress = async () => {
      try {
        // Check if user already has a family in localStorage
        const existingFamily = localStorage.getItem("kidoers_family")
        const existingMembers = localStorage.getItem("kidoers_members")
        
        if (existingFamily && existingMembers) {
          const familyData = JSON.parse(existingFamily)
          const membersData = JSON.parse(existingMembers)
          
          if (familyData.id && membersData.length > 0) {
            // User already has a family, move to routine step
            setCurrentStep(2)
            setFamilyId(familyData.id)
            console.log('Resuming onboarding from routine step - family already exists')
          }
        } else {
          console.log('Starting onboarding fresh - no existing family found')
        }
      } catch (error) {
        console.log('No existing onboarding progress found, starting fresh')
      }
    }

    checkExistingProgress()
  }, [])

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFamilyCreated = (newFamilyId: string) => {
    setFamilyId(newFamilyId)
    nextStep()
  }

  const handleRoutineCreated = async () => {
    setLoading(true)
    try {
      // Mark onboarding as completed in localStorage
      const currentUser = await auth.getCurrentUser()
      if (!currentUser || !familyId) {
        throw new Error("User or family not found")
      }

      // Update user profile in localStorage
      const userData = localStorage.getItem("kidoers_user")
      if (userData) {
        const user = JSON.parse(userData)
        user.onboarding_status = 'completed'
        localStorage.setItem("kidoers_user", JSON.stringify(user))
      }

      // Update family onboarding status in localStorage
      const familyData = localStorage.getItem("kidoers_family")
      if (familyData) {
        const family = JSON.parse(familyData)
        family.onboarding_status = 'completed'
        localStorage.setItem("kidoers_family", JSON.stringify(family))
      }

      console.log('Onboarding completed successfully')
      onComplete()
    } catch (error) {
      console.error("Error completing onboarding:", error)
      setError("Failed to complete onboarding. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <CreateFamilyStep onComplete={handleFamilyCreated} />
      case 2:
        return <CreateRoutineStep familyId={familyId!} onComplete={handleRoutineCreated} />
      default:
        return <CreateFamilyStep onComplete={handleFamilyCreated} />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Completing onboarding...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Welcome to Kidoers</h1>
          <p className="text-gray-600">Let's get your family set up in just a few steps</p>
        </div>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm font-medium text-primary">
              {Math.round((currentStep / totalSteps) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-2xl mx-auto">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="max-w-2xl mx-auto mt-8 flex justify-between">
          {/* Only show Previous button if not on first step */}
          {currentStep > 1 ? (
            <button
              onClick={prevStep}
              className="px-6 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Previous
            </button>
          ) : (
            <div></div>
          )}
          
          <div className="text-sm text-gray-500">
            Step {currentStep} of {totalSteps}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto mt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
