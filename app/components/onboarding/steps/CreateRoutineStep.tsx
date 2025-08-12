"use client"

import { useState } from "react"
import { auth } from "../../../lib/supabase"
import { apiService } from "../../../lib/api"

interface CreateRoutineStepProps {
  familyId: string
  onComplete: () => void
}

export default function CreateRoutineStep({ familyId, onComplete }: CreateRoutineStepProps) {
  const [routineName, setRoutineName] = useState("")
  const [taskGroups, setTaskGroups] = useState([
    { name: "Morning Routine", icon: "🌅", color: "blue" }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!routineName.trim()) {
      setError("Please enter a routine name")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const currentUser = await auth.getCurrentUser()
      if (!currentUser) {
        throw new Error("User not authenticated")
      }

      // Start tracking this step
      // await apiService.startOnboardingStep('create_routine', familyId)

      // Create routine via backend API
      const routine = await apiService.createRoutine({
        name: routineName.trim(),
        family_id: familyId,
        created_by: currentUser.id,
        source: 'manual'
      })

      // Create task groups via backend API
      for (const group of taskGroups) {
        await apiService.createRoutineTaskGroup({
          name: group.name,
          routine_id: routine.id,
          icon: group.icon,
          color: group.color
        })
      }

      // Create some sample tasks via backend API
      const sampleTasks = [
        {
          name: "Make bed",
          description: "Start the day with a tidy room",
          points: 1,
          time_of_day: "morning",
          frequency: "daily",
          days_of_week: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        },
        {
          name: "Brush teeth",
          description: "Maintain good oral hygiene",
          points: 1,
          time_of_day: "morning",
          frequency: "daily",
          days_of_week: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        }
      ]

      for (const task of sampleTasks) {
        await apiService.createRoutineTask({
          ...task,
          routine_id: routine.id,
          group_id: null // These are standalone tasks
        })
      }

      // Mark this step as completed
      // await apiService.completeOnboardingStep('create_routine', familyId, {
      //   routine_name: routineName.trim(),
      //   task_groups_count: taskGroups.length,
      //   sample_tasks_count: sampleTasks.length
      // })

      onComplete()
    } catch (error) {
      console.error("Error creating routine:", error)
      setError("Failed to create routine. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Create Your First Routine</h2>
        <p className="text-gray-600">Set up a daily routine with tasks for your family</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="routineName" className="block text-sm font-medium text-gray-700 mb-2">
            Routine Name
          </label>
          <input
            type="text"
            id="routineName"
            value={routineName}
            onChange={(e) => setRoutineName(e.target.value)}
            placeholder="e.g., Morning Routine, Daily Chores"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Task Groups (Optional)
          </label>
          <div className="space-y-3">
            {taskGroups.map((group, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="text"
                  value={group.name}
                  onChange={(e) => {
                    const newGroups = [...taskGroups]
                    newGroups[index].name = e.target.value
                    setTaskGroups(newGroups)
                  }}
                  placeholder="Group name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={loading}
                />
                <input
                  type="text"
                  value={group.icon}
                  onChange={(e) => {
                    const newGroups = [...taskGroups]
                    newGroups[index].icon = e.target.value
                    setTaskGroups(newGroups)
                  }}
                  placeholder="Icon"
                  className="w-16 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-center"
                  disabled={loading}
                />
                <select
                  value={group.color}
                  onChange={(e) => {
                    const newGroups = [...taskGroups]
                    newGroups[index].color = e.target.value
                    setTaskGroups(newGroups)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={loading}
                >
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="yellow">Yellow</option>
                  <option value="orange">Orange</option>
                  <option value="purple">Purple</option>
                  <option value="pink">Pink</option>
                  <option value="teal">Teal</option>
                  <option value="indigo">Indigo</option>
                </select>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTaskGroups([...taskGroups, { name: "", icon: "📝", color: "blue" }])}
            className="mt-2 text-sm text-primary hover:text-primary-dark"
            disabled={loading}
          >
            + Add another group
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="text-center">
          <button
            type="submit"
            disabled={loading || !routineName.trim()}
            className={`px-8 py-3 rounded-lg font-medium transition-colors ${
              loading || !routineName.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating Routine...
              </div>
            ) : (
              'Complete Onboarding'
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          This will create your first routine with sample tasks. You can customize it later!
        </p>
      </div>
    </div>
  )
}
