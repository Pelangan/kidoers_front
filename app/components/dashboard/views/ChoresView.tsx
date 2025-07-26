"use client"

import { useState, useEffect } from "react"
import { Plus, Check, CheckSquare, Clock, Folder, ChevronLeft, ChevronRight, Edit3, Trash2, X } from "lucide-react"
import { storage } from "../../../lib/storage"
import AddChoreModal from "../../chores/AddChoreModal"

import type { Chore, FamilyMember } from "../../onboarding/OnboardingWizard"

type GroupByType = "time" | "categories"

export default function ChoresView() {
  const [chores, setChores] = useState<Chore[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [familyName, setFamilyName] = useState("")
  const [loading, setLoading] = useState(true)
  const [groupBy, setGroupBy] = useState<GroupByType>("time")
  const [isAddChoreModalOpen, setIsAddChoreModalOpen] = useState(false)

  // Helper function to capitalize the first letter of each word
  const capitalizeWords = (str: string) => {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  };
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedChores, setSelectedChores] = useState<string[]>([])
  const [showPasscodeModal, setShowPasscodeModal] = useState(false)
  const [passcode, setPasscode] = useState("")
  const [draggedChore, setDraggedChore] = useState<string | null>(null)
  const [dragOverMember, setDragOverMember] = useState<string | null>(null)
  const [showDropActions, setShowDropActions] = useState<{choreId: string, memberId: string, x: number, y: number} | null>(null)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = () => {
    try {
      const membersData = storage.getMembers()
      const choresData = storage.getChores()
      const familyData = storage.getFamily()

      setMembers(membersData || [])
      setChores(choresData || [])
      setFamilyName(familyData?.name || "My Family")
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

  const handleAddChore = (newChore: Chore) => {
    const updatedChores = [...chores, newChore]
    setChores(updatedChores)
    storage.setChores(updatedChores)
  }

  const handleAddMultipleChores = (newChores: Chore[]) => {
    const updatedChores = [...chores, ...newChores]
    setChores(updatedChores)
    storage.setChores(updatedChores)
  }

  // Edit mode functions
  const handleEditModeToggle = () => {
    setShowPasscodeModal(true)
  }

  const handlePasscodeSubmit = () => {
    // Simple passcode validation (in real app, this would be more secure)
    if (passcode === "1234") {
      setIsEditMode(true)
      setShowPasscodeModal(false)
      setPasscode("")
    } else {
      alert("Incorrect passcode")
      setPasscode("")
    }
  }

  const handleChoreSelection = (choreId: string) => {
    setSelectedChores(prev => 
      prev.includes(choreId) 
        ? prev.filter(id => id !== choreId)
        : [...prev, choreId]
    )
  }

  const handleDeleteSelected = () => {
    if (selectedChores.length === 0) return
    
    const updatedChores = chores.filter(chore => !selectedChores.includes(chore.id))
    setChores(updatedChores)
    storage.setChores(updatedChores)
    setSelectedChores([])
    setIsEditMode(false)
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
    setSelectedChores([])
    setDraggedChore(null)
  }

  // Drag and drop functions
  const handleDragStart = (e: React.DragEvent, choreId: string) => {
    const chore = chores.find(c => c.id === choreId)
    if (chore && !chore.completed) {
      setDraggedChore(choreId)
      e.dataTransfer.setData('text/plain', choreId)
      e.dataTransfer.effectAllowed = 'move'
    }
  }

  const handleDragOver = (e: React.DragEvent, memberId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverMember(memberId)
  }

  const handleDrop = (e: React.DragEvent, targetMemberId: string) => {
    e.preventDefault()
    if (!draggedChore) return

    const chore = chores.find(c => c.id === draggedChore)
    if (!chore || chore.completed) return

    // Show action popup at drop position
    setShowDropActions({
      choreId: draggedChore,
      memberId: targetMemberId,
      x: e.clientX,
      y: e.clientY
    })
    
    setDraggedChore(null)
    setDragOverMember(null)
  }

  const handleDragEnd = () => {
    setDraggedChore(null)
    setDragOverMember(null)
  }

  const handleMoveChore = () => {
    if (!showDropActions) return
    
    const chore = chores.find(c => c.id === showDropActions.choreId)
    if (!chore) return

    // Move the chore to the target member
    const updatedChores = chores.map(c => 
      c.id === showDropActions.choreId ? { ...c, assignedTo: showDropActions.memberId } : c
    )
    
    setChores(updatedChores)
    storage.setChores(updatedChores)
    setShowDropActions(null)
  }

  const handleDuplicateChore = () => {
    if (!showDropActions) return
    
    const chore = chores.find(c => c.id === showDropActions.choreId)
    if (!chore) return

    // Create a duplicate chore for the target member
    const newChore: Chore = {
      ...chore,
      id: Date.now().toString() + "_" + showDropActions.memberId,
      assignedTo: showDropActions.memberId,
      completed: false
    }
    
    const updatedChores = [...chores, newChore]
    setChores(updatedChores)
    storage.setChores(updatedChores)
    setShowDropActions(null)
  }

  const handleCancelDropAction = () => {
    setShowDropActions(null)
  }

  const handleEditChore = (chore: Chore) => {
    setEditingChore(chore)
  }

  const handleUpdateChore = (updatedChore: Chore) => {
    const updatedChores = chores.map(c => 
      c.id === updatedChore.id ? updatedChore : c
    )
    setChores(updatedChores)
    storage.setChores(updatedChores)
    setEditingChore(null)
  }

  const getChoresByMember = (memberId: string) => {
    return chores.filter((chore) => chore.assignedTo === memberId)
  }

  const getMemberTheme = (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    if (!member) {
      // Fallback to index-based theme for backward compatibility
      const themes = [
        {
          border: "border-blue-300",
          progress: "text-blue-600",
          progressBg: "bg-blue-100",
          taskBg: "bg-blue-50",
          taskText: "text-blue-700",
          taskBorder: "border-blue-200",
          completedText: "text-blue-800",
          completedBg: "bg-blue-100"
        },
        {
          border: "border-green-300",
          progress: "text-green-600",
          progressBg: "bg-green-100",
          taskBg: "bg-green-50",
          taskText: "text-green-700",
          taskBorder: "border-green-200",
          completedText: "text-green-800",
          completedBg: "bg-green-100"
        },
        {
          border: "border-yellow-300",
          progress: "text-yellow-600",
          progressBg: "bg-yellow-100",
          taskBg: "bg-yellow-50",
          taskText: "text-yellow-700",
          taskBorder: "border-yellow-200",
          completedText: "text-yellow-800",
          completedBg: "bg-yellow-100"
        },
        {
          border: "border-orange-300",
          progress: "text-orange-600",
          progressBg: "bg-orange-100",
          taskBg: "bg-orange-50",
          taskText: "text-orange-700",
          taskBorder: "border-orange-200",
          completedText: "text-orange-800",
          completedBg: "bg-orange-100"
        }
      ]
      const memberIndex = members.findIndex(m => m.id === memberId)
      return themes[memberIndex % themes.length]
    }

    // Use member's assigned color
    const colorMap: { [key: string]: any } = {
      blue: {
        border: "border-blue-300",
        progress: "text-blue-600",
        progressBg: "bg-blue-100",
        taskBg: "bg-blue-50",
        taskText: "text-blue-700",
        taskBorder: "border-blue-200",
        completedText: "text-blue-800",
        completedBg: "bg-blue-100"
      },
      green: {
        border: "border-green-300",
        progress: "text-green-600",
        progressBg: "bg-green-100",
        taskBg: "bg-green-50",
        taskText: "text-green-700",
        taskBorder: "border-green-200",
        completedText: "text-green-800",
        completedBg: "bg-green-100"
      },
      yellow: {
        border: "border-yellow-300",
        progress: "text-yellow-600",
        progressBg: "bg-yellow-100",
        taskBg: "bg-yellow-50",
        taskText: "text-yellow-700",
        taskBorder: "border-yellow-200",
        completedText: "text-yellow-800",
        completedBg: "bg-yellow-100"
      },
      orange: {
        border: "border-orange-300",
        progress: "text-orange-600",
        progressBg: "bg-orange-100",
        taskBg: "bg-orange-50",
        taskText: "text-orange-700",
        taskBorder: "border-orange-200",
        completedText: "text-orange-800",
        completedBg: "bg-orange-100"
      },
      purple: {
        border: "border-purple-300",
        progress: "text-purple-600",
        progressBg: "bg-purple-100",
        taskBg: "bg-purple-50",
        taskText: "text-purple-700",
        taskBorder: "border-purple-200",
        completedText: "text-purple-800",
        completedBg: "bg-purple-100"
      },
      pink: {
        border: "border-pink-300",
        progress: "text-pink-600",
        progressBg: "bg-pink-100",
        taskBg: "bg-pink-50",
        taskText: "text-pink-700",
        taskBorder: "border-pink-200",
        completedText: "text-pink-800",
        completedBg: "bg-pink-100"
      },
      teal: {
        border: "border-teal-300",
        progress: "text-teal-600",
        progressBg: "bg-teal-100",
        taskBg: "bg-teal-50",
        taskText: "text-teal-700",
        taskBorder: "border-teal-200",
        completedText: "text-teal-800",
        completedBg: "bg-teal-100"
      },
      indigo: {
        border: "border-indigo-300",
        progress: "text-indigo-600",
        progressBg: "bg-indigo-100",
        taskBg: "bg-indigo-50",
        taskText: "text-indigo-700",
        taskBorder: "border-indigo-200",
        completedText: "text-indigo-800",
        completedBg: "bg-indigo-100"
      }
    }

    return colorMap[member.color] || colorMap.blue
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{capitalizeWords(familyName)} Family</h2>
            <p className="text-muted-foreground">Track daily tasks for each family member</p>
          </div>
          <div className="flex items-center gap-4">
            {!isEditMode && (
              <button
                onClick={handleEditModeToggle}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </button>
            )}
            
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
          const theme = getMemberTheme(member.id)
          const progress = getProgressPercentage(member.id)
          const memberChores = getChoresByMember(member.id)
          const completedCount = memberChores.filter(chore => chore.completed).length
          const groupedChores = groupBy === "time" ? groupChoresByTime(member.id) : groupChoresByCategory(member.id)

          return (
            <div 
              key={member.id} 
              className={`bg-white rounded-lg border-2 ${theme.border} p-6 shadow-sm transition-all duration-200 ${
                isEditMode ? 'min-h-[300px]' : ''
              } ${
                isEditMode && dragOverMember === member.id ? 'bg-blue-50 border-blue-400 shadow-lg' : ''
              }`}
              onDragOver={isEditMode ? (e) => handleDragOver(e, member.id) : undefined}
              onDrop={isEditMode ? (e) => handleDrop(e, member.id) : undefined}
            >
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
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                            chore.completed ? theme.completedBg : theme.taskBg
                          } ${theme.taskBorder} hover:shadow-sm ${
                            isEditMode ? 'cursor-grab' : 'cursor-pointer'
                          } ${draggedChore === chore.id ? 'opacity-50' : ''}`}
                          onClick={() => isEditMode ? handleChoreSelection(chore.id) : toggleChore(chore.id, chore.completed)}
                          draggable={isEditMode && !chore.completed}
                          onDragStart={(e) => isEditMode && !chore.completed && handleDragStart(e, chore.id)}
                          onDragEnd={handleDragEnd}
                        >
                          {isEditMode ? (
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selectedChores.includes(chore.id)
                                  ? "bg-red-500 border-red-500"
                                  : "border-gray-300 bg-white"
                              }`}
                            >
                              {selectedChores.includes(chore.id) && <X className="h-3 w-3 text-white" />}
                            </div>
                          ) : (
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                chore.completed 
                                  ? "bg-green-500 border-green-500" 
                                  : `border-${theme.progress.split('-')[1]}-400`
                              }`}
                            >
                              {chore.completed && <Check className="h-3 w-3 text-white" />}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${theme.taskText} ${
                              chore.completed ? "line-through opacity-60" : ""
                            }`}>
                              {chore.title}
                            </span>
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-white text-black border border-gray-300">
                              {chore.frequency === 'daily' ? 'Daily' : 
                               chore.frequency === 'weekly' ? 'Weekly' : 'Weekends'}
                            </span>
                          </div>
                          {isEditMode && (
                            <div className="ml-auto flex gap-2">
                              {!chore.completed && (
                                <div className="text-gray-400">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                  </svg>
                                </div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditChore(chore)
                                }}
                                className="text-gray-400 hover:text-blue-500 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </div>
                          )}
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

      {/* Edit Mode Toolbar */}
      {isEditMode && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-4 z-50">
          <span className="text-sm text-gray-600">
            {selectedChores.length} selected
          </span>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedChores.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected
          </button>
          <button
            onClick={handleCancelEdit}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsAddChoreModalOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50 ${
          isEditMode ? 'bottom-20' : ''
        }`}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Add/Edit Chore Modal */}
      <AddChoreModal
        isOpen={isAddChoreModalOpen || editingChore !== null}
        onClose={() => {
          setIsAddChoreModalOpen(false)
          setEditingChore(null)
        }}
        onSave={handleAddChore}
        onSaveMultiple={handleAddMultipleChores}
        onUpdate={handleUpdateChore}
        members={members}
        existingChores={chores}
        editingChore={editingChore}
      />

      {/* Drop Action Popup */}
      {showDropActions && (
        <div className="fixed inset-0 z-50" onClick={handleCancelDropAction}>
          <div 
            className="absolute bg-white rounded-lg shadow-xl border border-gray-200 p-3 flex gap-2"
            style={{
              left: Math.min(showDropActions.x, window.innerWidth - 200),
              top: Math.min(showDropActions.y, window.innerHeight - 100)
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleMoveChore}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Move
            </button>
            <button
              onClick={handleDuplicateChore}
              className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Duplicate
            </button>
            <button
              onClick={handleCancelDropAction}
              className="flex items-center gap-2 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Passcode Modal */}
      {showPasscodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Enter Passcode</h3>
            <p className="text-sm text-gray-600 mb-4">Enter the 4-digit passcode to edit chores</p>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="1234"
              maxLength={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              onKeyPress={(e) => e.key === "Enter" && handlePasscodeSubmit()}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowPasscodeModal(false)
                  setPasscode("")
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasscodeSubmit}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
