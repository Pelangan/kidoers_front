"use client"

import { useState, useEffect } from "react"
import { Plus, Check, CheckSquare, Clock, Folder } from "lucide-react"
import { storage } from "../../../lib/storage"

interface Chore {
  id: string
  title: string
  description?: string
  completed: boolean
  assignedTo: string
  frequency: "daily" | "weekly" | "weekends"
  category?: string
  timeOfDay?: "morning" | "afternoon" | "evening"
}

interface FamilyMember {
  id: string
  name: string
  role: "parent" | "child"
}

type GroupByType = "time" | "categories"

export default function ChoresView() {
  const [chores, setChores] = useState<Chore[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [groupBy, setGroupBy] = useState<GroupByType>("time")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = () => {
    try {
      const membersData = storage.getMembers()
      const choresData = storage.getChores()

      setMembers(membersData || [])
      setChores(choresData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleChore = (choreId: string, completed: boolean) => {
    const updatedChores = chores.map((chore) => (chore.id === choreId ? { ...chore, completed: !completed } : chore))

    setChores(updatedChores)
    storage.setChores(updatedChores)
  }

  const getChoresByMember = (memberId: string) => {
    return chores.filter((chore) => chore.assignedTo === memberId)
  }

  const getMemberTheme = (index: number) => {
    const themes = [
      {
        border: "border-blue-300",
        progress: "text-blue-600",
        progressBg: "bg-blue-100",
        taskBg: "bg-blue-50",
        taskText: "text-blue-700",
        taskBorder: "border-blue-200"
      },
      {
        border: "border-green-300",
        progress: "text-green-600",
        progressBg: "bg-green-100",
        taskBg: "bg-green-50",
        taskText: "text-green-700",
        taskBorder: "border-green-200"
      },
      {
        border: "border-yellow-300",
        progress: "text-yellow-600",
        progressBg: "bg-yellow-100",
        taskBg: "bg-yellow-50",
        taskText: "text-yellow-700",
        taskBorder: "border-yellow-200"
      },
      {
        border: "border-orange-300",
        progress: "text-orange-600",
        progressBg: "bg-orange-100",
        taskBg: "bg-orange-50",
        taskText: "text-orange-700",
        taskBorder: "border-orange-200"
      }
    ]
    return themes[index % themes.length]
  }

  const getProgressPercentage = (memberId: string) => {
    const memberChores = getChoresByMember(memberId)
    if (memberChores.length === 0) return 0
    const completed = memberChores.filter(chore => chore.completed).length
    return Math.round((completed / memberChores.length) * 100)
  }

  const getTimeOfDay = (chore: Chore) => {
    // Use the timeOfDay property from onboarding if available
    if (chore.timeOfDay) {
      return chore.timeOfDay.charAt(0).toUpperCase() + chore.timeOfDay.slice(1)
    }
    
    // Fallback to title-based logic for legacy data
    const title = chore.title.toLowerCase()
    if (title.includes('breakfast') || title.includes('bed') || title.includes('morning')) {
      return 'Morning'
    } else if (title.includes('lunch') || title.includes('afternoon') || title.includes('plants')) {
      return 'Afternoon'
    } else if (title.includes('dinner') || title.includes('dishes') || title.includes('trash') || title.includes('toys')) {
      return 'Evening'
    } else {
      // Default based on frequency
      switch (chore.frequency) {
        case 'daily':
          return 'Morning'
        case 'weekly':
          return 'Afternoon'
        case 'weekends':
          return 'Evening'
        default:
          return 'Morning'
      }
    }
  }

  const groupChoresByTime = (memberId: string) => {
    const memberChores = getChoresByMember(memberId)
    const grouped: { [key: string]: Chore[] } = {}
    
    memberChores.forEach(chore => {
      const timeOfDay = getTimeOfDay(chore)
      if (!grouped[timeOfDay]) {
        grouped[timeOfDay] = []
      }
      grouped[timeOfDay].push(chore)
    })
    
    return grouped
  }

  const groupChoresByCategory = (memberId: string) => {
    const memberChores = getChoresByMember(memberId)
    const grouped: { [key: string]: Chore[] } = {}

    memberChores.forEach(chore => {
      const category = chore.category || "No Category"
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(chore)
    })

    return grouped
  }

  const getTimeIcon = (timeOfDay: string) => {
    switch (timeOfDay) {
      case 'Morning':
        return '🌅'
      case 'Afternoon':
        return '☀️'
      case 'Evening':
        return '🌙'
      default:
        return '⏰'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Today's Chores</h2>
          <p className="text-muted-foreground">Track daily tasks for each family member</p>
        </div>
      </div>

      {/* Group By Controls */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm font-medium text-muted-foreground">Group by:</span>
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setGroupBy("time")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              groupBy === "time"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-4 w-4" />
            Time of Day
          </button>
          <button
            onClick={() => setGroupBy("categories")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              groupBy === "categories"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Folder className="h-4 w-4" />
            Categories
          </button>
        </div>
      </div>

      {/* Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {members.map((member, index) => {
          const theme = getMemberTheme(index)
          const progress = getProgressPercentage(member.id)
          const memberChores = getChoresByMember(member.id)
          const completedCount = memberChores.filter(chore => chore.completed).length
          const groupedChores = groupBy === "time" ? groupChoresByTime(member.id) : groupChoresByCategory(member.id)

          return (
            <div key={member.id} className={`bg-white rounded-lg border-2 ${theme.border} p-6 shadow-sm`}>
              {/* Member Header */}
              <div className="mb-4">
                <h3 className="font-bold text-lg text-foreground mb-3">{member.name}</h3>
                
                {/* Progress Indicator */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative">
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-gray-200"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={`${theme.progress} transition-all duration-500`}
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        strokeDasharray={`${progress}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xs font-bold ${theme.progress}`}>{progress}%</span>
                    </div>
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${theme.progress}`}>Progress</div>
                    <div className="text-xs text-muted-foreground">{completedCount}/{memberChores.length} tasks</div>
                  </div>
                </div>
              </div>

              {/* Chores by Time of Day or Categories */}
              <div className="space-y-4">
                {Object.entries(groupedChores).map(([groupName, groupChores]) => (
                  <div key={groupName}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">
                        {groupBy === "time" ? getTimeIcon(groupName) : "📁"}
                      </span>
                      <h4 className="text-sm font-semibold text-foreground">{groupName}</h4>
                    </div>
                    <div className="space-y-2">
                      {groupChores.map((chore) => (
                        <div
                          key={chore.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${theme.taskBg} ${theme.taskBorder} hover:shadow-sm`}
                          onClick={() => toggleChore(chore.id, chore.completed)}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              chore.completed 
                                ? "bg-green-500 border-green-500" 
                                : `border-${theme.progress.split('-')[1]}-400`
                            }`}
                          >
                            {chore.completed && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <span className={`text-sm font-medium ${theme.taskText} ${
                            chore.completed ? "line-through opacity-60" : ""
                          }`}>
                            {chore.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {memberChores.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No chores assigned</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {members.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No family members found</h3>
          <p className="text-muted-foreground">Complete the onboarding process to add family members and chores.</p>
        </div>
      )}

      {/* Floating Action Button */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50">
        <Plus className="h-6 w-6" />
      </button>
    </div>
  )
}
