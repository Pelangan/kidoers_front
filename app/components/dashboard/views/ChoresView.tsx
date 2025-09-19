"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Edit3, User } from "lucide-react"
import { apiService } from "../../../lib/api"
import FamilyMemberColumn from "../../common/FamilyMemberColumn"
import type { FamilyMember } from "../../../lib/api"

interface TaskInstance {
  id: string
  routine_id: string
  routine_task_id: string
  task_assignment_id: string
  member_id: string
  due_date: string
  time_of_day: string
  due_at?: string
  status: 'pending' | 'completed' | 'overdue' | 'skipped'
  completed_at?: string
  verified_by?: string
  points_awarded: number
  notes?: string
  created_at: string
  // Additional fields from routine task
  task_name?: string
  task_description?: string
  group_name?: string
  group_id?: string
}

interface EnhancedFamilyMember {
  id: string
  name: string
  role: 'parent' | 'child'
  age?: number | null
  color: string
  borderColor?: string
  taskBgColor?: string
  avatar_url?: string | null
  taskInstances: TaskInstance[]
  groups: Array<{
    id: string
    name: string
    tasks: TaskInstance[]
  }>
  individualTasks: TaskInstance[]
}

interface ChoresViewProps {
  familyId?: string | null
  onNavigateToRoutineBuilder?: () => void
}

export default function ChoresView({ familyId: propFamilyId, onNavigateToRoutineBuilder }: ChoresViewProps = {}) {
  console.log('ChoresView: Component rendered with onNavigateToRoutineBuilder:', !!onNavigateToRoutineBuilder)
  const router = useRouter()
  const [enhancedFamilyMembers, setEnhancedFamilyMembers] = useState<EnhancedFamilyMember[]>([])
  const [familyName, setFamilyName] = useState("")
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [error, setError] = useState<string | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(false) // Prevent duplicate API calls

  // Color mapping function for family members - updated for chores view styling
  const getMemberColors = (color: string) => {
    const colorMap: Record<string, { border: string; cardBg: string; taskBg: string }> = {
      blue: { border: 'border-blue-500', cardBg: 'bg-white', taskBg: 'bg-blue-50' },
      green: { border: 'border-green-500', cardBg: 'bg-white', taskBg: 'bg-green-50' },
      yellow: { border: 'border-yellow-500', cardBg: 'bg-white', taskBg: 'bg-yellow-50' },
      orange: { border: 'border-orange-500', cardBg: 'bg-white', taskBg: 'bg-orange-50' },
      purple: { border: 'border-purple-500', cardBg: 'bg-white', taskBg: 'bg-purple-50' },
      pink: { border: 'border-pink-500', cardBg: 'bg-white', taskBg: 'bg-pink-50' },
      teal: { border: 'border-teal-500', cardBg: 'bg-white', taskBg: 'bg-teal-50' },
      indigo: { border: 'border-indigo-500', cardBg: 'bg-white', taskBg: 'bg-indigo-50' }
    }
    return colorMap[color] || { border: 'border-gray-500', cardBg: 'bg-white', taskBg: 'bg-gray-50' }
  }

  useEffect(() => {
    console.log('🔄 ChoresView: useEffect triggered, currentDate:', currentDate.toISOString().split('T')[0], 'familyId:', propFamilyId)
    if (propFamilyId) {
      loadData()
    }
  }, [currentDate, propFamilyId])

  const loadData = async () => {
    console.log('📊 ChoresView: loadData() started')
    
    // Prevent duplicate calls
    if (isLoadingData) {
      console.log('⏸️ ChoresView: loadData() already in progress, skipping')
      return
    }
    
    setIsLoadingData(true)
    try {
      setLoading(true)
      setError(null)

      // Use familyId from props instead of calling getOnboardingStatus again
      if (!propFamilyId) {
        setError("No family ID provided. Please refresh the page.")
        return
      }
      
      // Get family members
      console.log('👥 ChoresView: Calling getFamilyMembers()')
      const members = await apiService.getFamilyMembers(propFamilyId)
      
      // Get today's task instances
      const today = currentDate.toISOString().split('T')[0]
      console.log('📅 ChoresView: Calling task-instances for date:', today)
      const taskInstances = await apiService.makeRequest<TaskInstance[]>(
        `/families/${propFamilyId}/task-instances?start_date=${today}&end_date=${today}`
      )

      // Get routine data to get task names and group information
      console.log('📋 ChoresView: Calling routines?family_id')
      const routines = await apiService.makeRequest<any[]>(`/routines?family_id=${propFamilyId}`)
      const activeRoutine = routines.find(r => r.status === 'active')
      
      if (!activeRoutine) {
        setError("No active routine found. Please create a routine first.")
        return
      }

      // Get routine tasks and groups
      console.log('🔧 ChoresView: Calling routine tasks and groups')
      const [routineTasks, routineGroups] = await Promise.all([
        apiService.makeRequest<any[]>(`/routines/${activeRoutine.id}/tasks`),
        apiService.makeRequest<any[]>(`/routines/${activeRoutine.id}/groups`)
      ])

      // Create a map of task instances by member
      const instancesByMember = new Map<string, TaskInstance[]>()
      for (const instance of taskInstances) {
        const memberId = instance.member_id
        if (!instancesByMember.has(memberId)) {
          instancesByMember.set(memberId, [])
        }
        instancesByMember.get(memberId)!.push(instance)
      }

      // Enhance task instances with task and group information
      const enhancedInstances = taskInstances.map(instance => {
        const task = routineTasks.find(t => t.id === instance.routine_task_id)
        const group = routineGroups.find(g => g.id === task?.group_id)
        
        return {
          ...instance,
          task_name: task?.name || 'Unknown Task',
          task_description: task?.description,
          group_name: group?.name,
          group_id: group?.id
        }
      })

      // Create enhanced family members with their task instances
      const enhancedMembers: EnhancedFamilyMember[] = members.map(member => {
        const memberInstances = instancesByMember.get(member.id!) || []
        const enhancedMemberInstances = memberInstances.map(instance => {
          const task = routineTasks.find(t => t.id === instance.routine_task_id)
          const group = routineGroups.find(g => g.id === task?.group_id)
          
          return {
            ...instance,
            task_name: task?.name || 'Unknown Task',
            task_description: task?.description,
            group_name: group?.name,
            group_id: group?.id
          }
        })

        // Separate instances into groups and individual tasks
        const groupInstances = enhancedMemberInstances.filter(instance => instance.group_id)
        const individualInstances = enhancedMemberInstances.filter(instance => !instance.group_id)

        // Group instances by group
        const groupsMap = new Map<string, { id: string; name: string; tasks: TaskInstance[] }>()
        for (const instance of groupInstances) {
          if (instance.group_id && instance.group_name) {
            if (!groupsMap.has(instance.group_id)) {
              groupsMap.set(instance.group_id, {
                id: instance.group_id,
                name: instance.group_name,
                tasks: []
              })
            }
            groupsMap.get(instance.group_id)!.tasks.push(instance)
          }
        }

        // Apply color mapping
        const colors = getMemberColors(member.color)
        
        return {
          id: member.id!,
          name: member.name,
          role: member.role,
          age: member.age,
          color: colors.cardBg, // White background for the card
          borderColor: colors.border, // Family member color for the border
          taskBgColor: colors.taskBg, // Lighter family member color for tasks
          avatar_url: member.avatar_url,
          taskInstances: enhancedMemberInstances,
          groups: Array.from(groupsMap.values()),
          individualTasks: individualInstances
        }
      })

      setEnhancedFamilyMembers(enhancedMembers)

    } catch (err: any) {
      console.error('Error loading chores data:', err)
      setError(err.message || 'Failed to load chores data')
    } finally {
      setLoading(false)
      setIsLoadingData(false) // Reset loading state
    }
  }

  const toggleTaskInstance = async (instanceId: string, completed: boolean) => {
    try {
      if (completed) {
        // Mark as completed
        await apiService.makeRequest(`/families/${enhancedFamilyMembers[0]?.id}/task-instances/${instanceId}/complete`, {
          method: 'POST',
          body: JSON.stringify({})
        })
      } else {
        // Mark as pending (uncomplete)
        await apiService.makeRequest(`/families/${enhancedFamilyMembers[0]?.id}/task-instances/${instanceId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'pending' })
        })
      }
      
      // Reload data to reflect changes
      loadData()
    } catch (err) {
      console.error('Error updating task instance:', err)
    }
  }

  const getTotalTasks = (member: EnhancedFamilyMember) => {
    return member.taskInstances.length
  }

  const getCompletedTasks = (member: EnhancedFamilyMember) => {
    return member.taskInstances.filter(instance => instance.status === 'completed').length
  }

  const getProgressPercentage = (member: EnhancedFamilyMember) => {
    const total = getTotalTasks(member)
    if (total === 0) return 0
    const completed = getCompletedTasks(member)
    return Math.round((completed / total) * 100)
  }


  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const handleEditClick = () => {
    console.log('ChoresView: Edit button clicked, onNavigateToRoutineBuilder:', !!onNavigateToRoutineBuilder)
    // Navigate to routine builder for editing
    if (onNavigateToRoutineBuilder) {
      console.log('ChoresView: Calling onNavigateToRoutineBuilder callback')
      onNavigateToRoutineBuilder()
    } else {
      console.log('ChoresView: No callback provided, using fallback navigation')
      // Fallback: navigate to separate page
      if (familyId) {
        router.push(`/onboarding/custom?family=${familyId}`)
      } else {
        router.push('/onboarding/custom')
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={loadData}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{familyName} Family</h2>
            <p className="text-muted-foreground">Track daily tasks for each family member</p>
          </div>
          <div className="flex items-center gap-4">
              <button
              onClick={handleEditClick}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </button>
            
            {/* Day Navigation */}
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => {
                  const newDate = new Date(currentDate)
                  newDate.setDate(currentDate.getDate() - 1)
                  setCurrentDate(newDate)
                }}
                className="p-3 bg-white hover:bg-gray-50 transition-colors border-r border-gray-200"
              >
                <ChevronLeft className="h-4 w-4 text-gray-700" />
              </button>

              <button
                onClick={() => {
                  setCurrentDate(new Date())
                }}
                className="px-4 py-3 bg-white hover:bg-gray-50 transition-colors border-r border-gray-200"
              >
                <span className="text-sm font-semibold text-gray-900">Today</span>
              </button>

              <button
                onClick={() => {
                  const newDate = new Date(currentDate)
                  newDate.setDate(currentDate.getDate() + 1)
                  setCurrentDate(newDate)
                }}
                className="p-3 bg-white hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-gray-700" />
              </button>
          </div>
        </div>
      </div>

        {/* Date Display */}
        <div className="mt-2 text-sm text-muted-foreground">
          {formatDate(currentDate)}
        </div>
      </div>

      {/* Family Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {enhancedFamilyMembers.map((member) => {
          const totalTasks = getTotalTasks(member)
          const completedTasks = getCompletedTasks(member)
          const progress = getProgressPercentage(member)
          
          // Transform task instances to the common Task interface
          const transformTask = (instance: TaskInstance) => ({
            id: instance.id,
            name: instance.task_name || 'Unknown Task',
            description: instance.task_description,
            points: instance.points_awarded,
            time_of_day: instance.time_of_day,
            completed: instance.status === 'completed',
            status: instance.status,
            group_id: instance.group_id
          })

          const groups = member.groups.map(group => ({
            ...group,
            tasks: group.tasks.map(transformTask)
          }))

          const individualTasks = member.individualTasks.map(transformTask)

          return (
            <FamilyMemberColumn
              key={member.id} 
              member={member}
              groups={groups}
              individualTasks={individualTasks}
              totalTasks={totalTasks}
              completedTasks={completedTasks}
              progress={progress}
              mode="chores-view"
              onTaskClick={(taskId) => {
                const instance = member.taskInstances.find(t => t.id === taskId)
                if (instance) {
                  toggleTaskInstance(instance.id, instance.status !== 'completed')
                }
              }}
              showProgress={true}
              emptyStateMessage={{
                title: "No tasks today",
                subtitle: "Tasks will appear here when scheduled"
              }}
            />
          )
        })}
      </div>

      {enhancedFamilyMembers.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No family members found</h3>
          <p className="text-muted-foreground">Complete the onboarding process to add family members and chores.</p>
        </div>
      )}
    </div>
  )
}
