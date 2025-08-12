"use client"

import { useState, useEffect } from "react"
import { auth } from "../../lib/supabase"
import { apiService } from "../../lib/api"
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
        // Temporarily disabled step progress tracking to avoid API errors
        // const progress = await apiService.getAllOnboardingStepsProgress()
        
        // For now, just log that we're starting fresh
        console.log('Starting onboarding fresh - step progress tracking disabled')
        
        // TODO: Re-enable when backend endpoints are working
        /*
        // If user has completed steps, determine where to resume
        if (progress && progress.length > 0) {
          const completedSteps = progress.filter(step => step.status === 'completed')
          const inProgressSteps = progress.filter(step => step.status === 'in_progress')
          
          if (completedSteps.length > 0) {
            // Find the last completed step to determine next step
            const lastCompleted = completedSteps.sort((a, b) => 
              new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
            )[0]
            
            if (lastCompleted.step_key === 'create_family') {
              // Family created, move to routine step
              setCurrentStep(2)
              setFamilyId(lastCompleted.family_id || null)
            }
          } else if (inProgressSteps.length > 0) {
            // Resume from in-progress step
            const inProgress = inProgressSteps[0]
            if (inProgress.step_key === 'create_family') {
              setCurrentStep(1)
            } else if (inProgress.step_key === 'create_routine') {
              setCurrentStep(2)
              setFamilyId(inProgress.family_id || null)
            }
          }
        } else {
          // No existing progress, start tracking the onboarding process
          try {
            await apiService.startOnboardingStep('onboarding_started')
          } catch (error) {
            console.log('Could not start onboarding tracking')
          }
        }
        */
      } catch (error) {
        console.log('No existing onboarding progress found, starting fresh')
        // Start tracking the onboarding process
        try {
          await apiService.startOnboardingStep('onboarding_started')
        } catch (error) {
          console.log('Could not start onboarding tracking')
        }
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
      // Mark onboarding as completed
      const currentUser = await auth.getCurrentUser()
      if (!currentUser || !familyId) {
        throw new Error("User or family not found")
      }

      // Update family onboarding status via backend API
      await apiService.updateFamily(familyId, { onboarding_status: 'completed' })

      // Update user onboarding status via backend API
      await apiService.updateUserProfile({ onboarding_status: 'completed' })

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
