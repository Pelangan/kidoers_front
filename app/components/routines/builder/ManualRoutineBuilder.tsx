'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "../../../../components/ui/button"
import { Input } from "../../../../components/ui/input"
import { Label } from "../../../../components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card"
import { Badge } from "../../../../components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../../components/ui/dialog"
import { Textarea } from "../../../../components/ui/textarea"
import { Checkbox } from "../../../../components/ui/checkbox"
import { ArrowLeft, Plus, Trash2, Save, GripVertical, User, Folder, Users, Baby, UserCheck, Check, ChevronLeft, ChevronRight, ListTodo } from 'lucide-react'
import type { FamilyMember } from '../../../lib/api'
import { apiService, createRoutineDraft, patchRoutine, addRoutineGroup, addRoutineTask, deleteRoutineGroup, deleteRoutineTask, updateOnboardingStep, listLibraryGroups, listLibraryTasks } from '../../../lib/api'

interface ManualRoutineBuilderProps {
  familyId?: string
  onComplete?: () => void
}

interface Task {
  id: string
  name: string
  description: string
  points: number
  estimatedMinutes: number
  completed?: boolean
  is_system?: boolean
}

interface TaskGroup {
  id: string
  name: string
  description: string
  tasks: Task[]
  color: string
  is_system?: boolean
}

interface ApplyToOption {
  id: string
  label: string
  icon: React.ReactNode
  filter: (members: any[]) => any[]
}

interface PendingDrop {
  type: 'task' | 'group'
  item: Task | TaskGroup
  targetMemberId: string
  targetMemberName: string
}

export default function ManualRoutineBuilder({ familyId: propFamilyId, onComplete }: ManualRoutineBuilderProps = {}) {
  const router = useRouter()
  const sp = useSearchParams()
  const familyId = propFamilyId || sp?.get("family")
  
  const [routine, setRoutine] = useState<{ id: string; family_id: string; name: string; status: "draft"|"active"|"archived" }|null>(null)
  const [routineName, setRoutineName] = useState('')
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [isCreatingGroupFromTasks, setIsCreatingGroupFromTasks] = useState(false)
  const [draggedItem, setDraggedItem] = useState<{ type: 'task' | 'group', item: Task | TaskGroup } | null>(null)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)
  const [showApplyToPopup, setShowApplyToPopup] = useState(false)
  const [showOnlyTasks, setShowOnlyTasks] = useState(false)
  const [showOnlyGroups, setShowOnlyGroups] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string|null>(null)

  // Apply to options
  const applyToOptions: ApplyToOption[] = [
    { 
      id: 'none', 
      label: 'This member only', 
      icon: <User className="w-4 h-4" />,
      filter: () => [] 
    },
    { 
      id: 'all-kids', 
      label: 'All kids', 
      icon: <Baby className="w-4 h-4" />,
      filter: (members) => members.filter(m => m.type === 'child') 
    },
    { 
      id: 'all-parents', 
      label: 'All parents', 
      icon: <UserCheck className="w-4 h-4" />,
      filter: (members) => members.filter(m => m.type === 'parent') 
    },
    { 
      id: 'all-family', 
      label: 'All family', 
      icon: <Users className="w-4 h-4" />,
      filter: (members) => members 
    }
  ]

  // Family members with colors from the family creation
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [enhancedFamilyMembers, setEnhancedFamilyMembers] = useState<any[]>([])

  // Color mapping function for family members
  const getMemberColors = (color: string) => {
    const colorMap: Record<string, { border: string; bg: string }> = {
      blue: { border: 'border-blue-300', bg: 'bg-blue-50' },
      green: { border: 'border-green-300', bg: 'bg-green-50' },
      yellow: { border: 'border-yellow-300', bg: 'bg-yellow-50' },
      orange: { border: 'border-orange-300', bg: 'bg-orange-50' },
      purple: { border: 'border-purple-300', bg: 'bg-purple-50' },
      pink: { border: 'border-pink-300', bg: 'bg-pink-50' },
      teal: { border: 'border-teal-300', bg: 'bg-teal-50' },
      indigo: { border: 'border-indigo-300', bg: 'bg-indigo-50' }
    }
    return colorMap[color] || { border: 'border-gray-300', bg: 'bg-gray-50' }
  }

  // Load family members and create routine draft
  useEffect(() => {
    const loadData = async () => {
      if (!familyId) {
        router.push("/onboarding"); // safety
        return;
      }
      
      setBusy(true);
      setError(null);
      
      try {
        console.log('Updating onboarding step to:', "create_routine");
        await updateOnboardingStep(familyId, "create_routine"); // resume point
        console.log('Onboarding step updated successfully');
        
        console.log('Creating routine draft...');
        const created = await createRoutineDraft(familyId, "My Routine");
        console.log('Routine draft created:', created);
        setRoutine({
          id: created.id,
          family_id: created.family_id,
          name: created.name,
          status: created.status as "draft"|"active"|"archived"
        });
        setRoutineName(created.name);
        
        // Fetch family members
        console.log('Fetching family members...');
        const members = await apiService.getFamilyMembers(familyId);
        console.log('Family members fetched:', members);
        setFamilyMembers(members);
        
        // Enhance family members with the structure needed for the routine builder
        const enhanced = members.map((member: any) => {
          const colors = getMemberColors(member.color)
          return {
            id: member.id,
            name: member.name,
            type: member.role,
            color: 'bg-white',
            borderColor: colors.border,
            taskBgColor: colors.bg,
            groups: [],
            individualTasks: []
          }
        })
        setEnhancedFamilyMembers(enhanced)
      } catch (e: any) {
        console.error('Error in useEffect:', e);
        setError(e?.message || "Failed to start routine");
      } finally {
        setBusy(false);
      }
    }

    loadData()
  }, [familyId, router])

  // Library data from API
  const [libraryGroups, setLibraryGroups] = useState<TaskGroup[]>([])
  const [libraryTasks, setLibraryTasks] = useState<Task[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)

  // Load library data
  useEffect(() => {
    const loadLibraryData = async () => {
      if (!familyId) return
      
      setLibraryLoading(true)
      try {
        // Load both groups and tasks concurrently
        const [groupsData, tasksData] = await Promise.all([
          listLibraryGroups('', true),
          listLibraryTasks('')
        ])
        
        // Transform groups data
        const transformedGroups: TaskGroup[] = groupsData.map((group: any) => ({
          id: group.id,
          name: group.name,
          description: group.description || '',
          color: 'bg-blue-100 border-blue-300',
          is_system: group.is_system,
          tasks: group.items?.map((item: any) => ({
            id: item.task_id,
            name: item.name,
            description: '',
            points: item.default_points,
            estimatedMinutes: 5
          })) || []
        }))
        
        // Transform tasks data
        const transformedTasks: Task[] = tasksData.map((task: any) => ({
          id: task.id,
          name: task.name,
          description: task.description || '',
          points: task.default_points,
          estimatedMinutes: 5,
          is_system: task.is_system
        }))
        
        setLibraryGroups(transformedGroups)
        setLibraryTasks(transformedTasks)
      } catch (error) {
        console.error('Failed to load library data:', error)
      } finally {
        setLibraryLoading(false)
      }
    }

    loadLibraryData()
  }, [familyId])

  // Pre-defined task groups (now using API data)
  const [predefinedGroups] = useState<TaskGroup[]>([])

  // Pre-defined individual tasks (now using API data)
  const [predefinedTasks] = useState<Task[]>([])

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    color: 'bg-gray-100 border-gray-300'
  })

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'task' | 'group', item: Task | TaskGroup) => {
    setDraggedItem({ type, item })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDropOnMember = (e: React.DragEvent, memberId: string) => {
    e.preventDefault()
    if (!draggedItem) return

    const member = enhancedFamilyMembers.find(m => m.id === memberId)
    if (!member) return

    // Set up pending drop and show popup
    setPendingDrop({
      type: draggedItem.type,
      item: draggedItem.item,
      targetMemberId: memberId,
      targetMemberName: member.name
    })
    setShowApplyToPopup(true)
    setDraggedItem(null)
  }

  const handleApplyToSelection = (applyToId: string) => {
    if (!pendingDrop) return

    if (pendingDrop.type === 'task') {
      addTaskToMember(pendingDrop.targetMemberId, pendingDrop.item as Task, applyToId)
    } else if (pendingDrop.type === 'group') {
      addGroupToMember(pendingDrop.targetMemberId, pendingDrop.item as TaskGroup, applyToId)
    }

    // Close popup and reset
    setShowApplyToPopup(false)
    setPendingDrop(null)
  }

  const addGroupToMember = (memberId: string, group: TaskGroup, applyTo: string) => {
    const applyToOption = applyToOptions.find(option => option.id === applyTo)
    if (!applyToOption) return

    const targetMembers = applyTo === 'none' 
      ? enhancedFamilyMembers.filter(m => m.id === memberId)
      : applyToOption.filter(enhancedFamilyMembers)

    setEnhancedFamilyMembers(members =>
      members.map(member => {
        if (targetMembers.some(tm => tm.id === member.id)) {
          return {
            ...member,
            groups: [...member.groups, { ...group, id: `${group.id}-${member.id}-${Date.now()}` }]
          }
        }
        return member
      })
    )
  }

  const addTaskToMember = (memberId: string, task: Task, applyTo: string) => {
    const applyToOption = applyToOptions.find(option => option.id === applyTo)
    if (!applyToOption) return

    const targetMembers = applyTo === 'none' 
      ? enhancedFamilyMembers.filter(m => m.id === memberId)
      : applyToOption.filter(enhancedFamilyMembers)

    setEnhancedFamilyMembers(members =>
      members.map(member => {
        if (targetMembers.some(tm => tm.id === member.id)) {
          return {
            ...member,
            individualTasks: [...member.individualTasks, { ...task, id: `${task.id}-${member.id}-${Date.now()}` }]
          }
        }
        return member
      })
    )
  }

  const createGroupFromSelectedTasks = (memberId: string) => {
    if (selectedTasks.length === 0 || !newGroup.name.trim()) return

    const member = enhancedFamilyMembers.find(m => m.id === memberId)
    if (!member) return

    const tasksToGroup = member.individualTasks.filter((task: Task) => selectedTasks.includes(task.id))
    
    const newGroupWithTasks: TaskGroup = {
      id: `grouped-${Date.now()}`,
      name: newGroup.name,
      description: newGroup.description,
      color: newGroup.color,
      tasks: tasksToGroup
    }

    setEnhancedFamilyMembers(members =>
      members.map(m => {
        if (m.id === memberId) {
          return {
            ...m,
            groups: [...m.groups, newGroupWithTasks],
            individualTasks: m.individualTasks.filter((task: Task) => !selectedTasks.includes(task.id))
          }
        }
        return m
      })
    )

    setSelectedTasks([])
    setNewGroup({ name: '', description: '', color: 'bg-gray-100 border-gray-300' })
    setIsCreatingGroupFromTasks(false)
  }

  const removeGroup = (memberId: string, groupId: string) => {
    setEnhancedFamilyMembers(members =>
      members.map(member => {
        if (member.id === memberId) {
          return {
            ...member,
            groups: member.groups.filter((group: TaskGroup) => group.id !== groupId)
          }
        }
        return member
      })
    )
  }

  const removeTask = (memberId: string, taskId: string) => {
    setEnhancedFamilyMembers(members =>
      members.map(member => {
        if (member.id === memberId) {
          return {
            ...member,
            individualTasks: member.individualTasks.filter((task: Task) => task.id !== taskId)
          }
        }
        return member
      })
    )
  }

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const handleSaveRoutine = async () => {
    if (!routine) return
    
    setBusy(true)
    try {
      // Update routine name if changed
      if (routine.name !== routineName) {
        await patchRoutine(routine.id, { name: routineName })
      }
      
      // Publish the routine
      await patchRoutine(routine.id, { status: "active" })
      
      // If we have an onComplete callback (onboarding flow), use it
      if (onComplete) {
        onComplete()
      } else {
        // Otherwise, navigate to dashboard (standalone mode)
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Failed to save routine:', error)
      setError('Failed to save routine. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const getTotalTasks = (member: any) => {
    return member.groups.reduce((sum: number, group: TaskGroup) => sum + group.tasks.length, 0) + member.individualTasks.length
  }



  const totalTasks = enhancedFamilyMembers.reduce((sum, member) => sum + getTotalTasks(member), 0)

  const panelWidth = isPanelCollapsed ? 'w-12' : 'w-96'
  // When used in onboarding mode, don't add right padding to allow full width expansion
  const mainPadding = onComplete ? '' : (isPanelCollapsed ? 'pr-12' : 'pr-96')

  // Filter tasks and groups based on show options
  const filteredGroups = showOnlyTasks ? [] : libraryGroups
  const filteredTasks = showOnlyGroups ? [] : libraryTasks

  return (
    <div className={`${onComplete ? 'min-h-0' : 'min-h-screen'} bg-white`}>
      <div className="flex">
        {/* Main Content */}
        <div className={`flex-1 p-6 ${mainPadding} transition-all duration-300`}>
          <div className="w-full space-y-6">
            {/* Header - Only show when not in onboarding mode */}
            {!onComplete && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Save className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Create Your Own Routine</h1>
                <p className="text-gray-600">Drag tasks and groups from the library to build your custom routine</p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">
                {error}
              </div>
            )}

            {/* Routine Details */}
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle>Routine Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="routineName">Routine Name</Label>
                    <Input
                      id="routineName"
                      placeholder="My Family Routine"
                      value={routineName}
                      onChange={(e) => setRoutineName(e.target.value)}
                      className="bg-white"
                      disabled={busy}
                    />
                  </div>
                  
                  {totalTasks > 0 && (
                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">{totalTasks}</span>
                        <span>total tasks</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">{enhancedFamilyMembers.length}</span>
                        <span>family members</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Family Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full">
              {enhancedFamilyMembers.map((member) => {
                const totalTasks = getTotalTasks(member)
                
                return (
                  <Card 
                    key={member.id} 
                    className={`${member.color} ${member.borderColor} border-2 hover:shadow-lg transition-all min-h-80`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnMember(e, member.id)}
                  >
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg text-gray-900">{member.name}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {totalTasks === 0 ? (
                        <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                          <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Drop tasks here</p>
                          <p className="text-xs">Drag from the library panel</p>
                        </div>
                      ) : (
                        <>
                          {/* Groups */}
                          {member.groups.map((group: TaskGroup) => (
                            <div key={group.id} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Folder className="w-4 h-4 text-gray-600" />
                                  <span className="font-medium text-sm text-gray-900">{group.name}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeGroup(member.id, group.id)}
                                  className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                              
                              {group.tasks.map((task: Task) => (
                                <div key={task.id} className={`ml-6 flex items-center space-x-3 p-3 ${member.taskBgColor} rounded-lg border border-gray-200`}>
                                  <div className="w-4 h-4 rounded border border-gray-400 flex items-center justify-center bg-white">
                                    {task.completed && <Check className="w-3 h-3 text-green-600" />}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">{task.name}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}

                          {/* Individual Tasks */}
                          {member.individualTasks.map((task: Task) => (
                            <div key={task.id} className={`flex items-center space-x-3 p-3 ${member.taskBgColor} rounded-lg border border-gray-200`}>
                              <Checkbox
                                checked={selectedTasks.includes(task.id)}
                                onCheckedChange={() => toggleTaskSelection(task.id)}
                              />
                              <div className="w-4 h-4 rounded border border-gray-400 flex items-center justify-center bg-white">
                                {task.completed && <Check className="w-3 h-3 text-green-600" />}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{task.name}</div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTask(member.id, task.id)}
                                className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}

                          {/* Group Selected Tasks Button */}
                          {selectedTasks.length > 0 && (
                            <Dialog open={isCreatingGroupFromTasks} onOpenChange={setIsCreatingGroupFromTasks}>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full text-xs bg-white"
                                onClick={() => setIsCreatingGroupFromTasks(true)}
                              >
                                <Folder className="w-3 h-3 mr-1" />
                                Group Selected ({selectedTasks.length})
                              </Button>
                              <DialogContent className="bg-white">
                                <DialogHeader>
                                  <DialogTitle>Create Group from Selected Tasks</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Group Name</Label>
                                    <Input
                                      value={newGroup.name}
                                      onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                                      placeholder="Enter group name"
                                      className="bg-white"
                                    />
                                  </div>
                                  <div>
                                    <Label>Description (optional)</Label>
                                    <Textarea
                                      value={newGroup.description}
                                      onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                                      placeholder="Describe this group"
                                      rows={2}
                                      className="bg-white"
                                    />
                                  </div>
                                  <Button 
                                    onClick={() => createGroupFromSelectedTasks(member.id)}
                                    disabled={!newGroup.name.trim()}
                                    className="w-full"
                                  >
                                    Create Group
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Save Button */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {!onComplete ? (
                <Button
                  variant="outline"
                  onClick={() => router.push('/onboarding/custom')}
                  className="flex items-center justify-center space-x-2 bg-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Options</span>
                </Button>
              ) : null}

              <Button
                onClick={handleSaveRoutine}
                disabled={totalTasks === 0 || busy}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white flex items-center justify-center space-x-2 flex-1"
              >
                {busy ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>💾 {onComplete ? 'Complete Onboarding' : 'Save My Routine'}</span>
                  </>
                )}
              </Button>
            </div>

            {totalTasks === 0 && (
              <p className="text-center text-sm text-amber-600">
                Drag tasks and groups from the library panel to family members
              </p>
            )}
          </div>
        </div>

        {/* Right Panel - Task Library */}
        <div className={`${onComplete ? 'absolute' : 'fixed'} right-0 top-0 h-full ${panelWidth} bg-white border-l border-gray-200 overflow-y-auto transition-all duration-300 z-10 shadow-lg`}>
          {/* Collapse/Expand Button */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              className="w-full flex items-center justify-center"
            >
              {isPanelCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>

          {!isPanelCollapsed && (
            <div className="p-4 space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">Task Library</h2>
                <p className="text-sm text-gray-600">Drag tasks and groups to your routine</p>
              </div>

              {/* Filter Options */}
              <div className="flex gap-2">
                <Button
                  variant={!showOnlyTasks && !showOnlyGroups ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setShowOnlyTasks(false)
                    setShowOnlyGroups(false)
                  }}
                  className="flex-1 text-xs"
                >
                  All
                </Button>
                <Button
                  variant={showOnlyGroups ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setShowOnlyGroups(true)
                    setShowOnlyTasks(false)
                  }}
                  className="flex-1 text-xs"
                >
                  Groups Only
                </Button>
                <Button
                  variant={showOnlyTasks ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setShowOnlyTasks(true)
                    setShowOnlyGroups(false)
                  }}
                  className="flex-1 text-xs"
                >
                  Tasks Only
                </Button>
              </div>

              {/* Task Groups */}
              {libraryLoading ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                    <Folder className="w-5 h-5" />
                    <span>Task Groups</span>
                  </h3>
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading groups...</p>
                  </div>
                </div>
              ) : filteredGroups.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                    <Folder className="w-5 h-5" />
                    <span>Task Groups</span>
                  </h3>
                  <div className="space-y-3">
                    {filteredGroups.map((group: TaskGroup) => (
                      <div
                        key={group.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'group', group)}
                        className={`p-4 rounded-lg border-2 cursor-move hover:shadow-md transition-all ${group.color}`}
                      >
                        <div className="flex items-start space-x-2">
                          <GripVertical className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold text-sm">{group.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {group.tasks.length} tasks
                              </Badge>
                              {group.is_system && (
                                <Badge className="text-xs bg-purple-100 text-purple-800">
                                  system
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mb-3">{group.description}</p>
                            <div className="space-y-1">
                              {group.tasks.slice(0, 3).map((task: Task) => (
                                <div key={task.id} className="text-xs text-gray-700 flex items-center space-x-2">
                                  <span>•</span>
                                  <span className="flex-1">{task.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {task.points}pts
                                  </Badge>
                                </div>
                              ))}
                              {group.tasks.length > 3 && (
                                <div className="text-xs text-gray-500">
                                  +{group.tasks.length - 3} more...
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Individual Tasks */}
              {libraryLoading ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                    <ListTodo className="w-5 h-5" />
                    <span>Individual Tasks</span>
                  </h3>
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading tasks...</p>
                  </div>
                </div>
              ) : filteredTasks.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                    <ListTodo className="w-5 h-5" />
                    <span>Individual Tasks</span>
                  </h3>
                  <div className="space-y-3">
                    {filteredTasks.map((task: Task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'task', task)}
                        className="p-3 bg-gray-50 rounded-lg border cursor-move hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start space-x-2">
                          <GripVertical className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-sm">{task.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {task.points}pts
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">{task.description}</p>
                            <div className="flex items-center space-x-2">
                              {task.is_system && (
                                <Badge className="text-xs bg-purple-100 text-purple-800">
                                  system
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {task.estimatedMinutes}min
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 text-sm mb-2">How to use:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Drag tasks to family member cards</li>
                  <li>• Choose who gets the task after dropping</li>
                  <li>• Drag groups to add all tasks at once</li>
                  <li>• Select individual tasks to group them</li>
                  <li>• Remove with trash icons</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Apply To Popup */}
        <Dialog open={showApplyToPopup} onOpenChange={setShowApplyToPopup}>
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <DialogTitle>Apply Tasks To</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                You dropped {pendingDrop?.type === 'group' ? 'a group' : 'a task'} on <span className="font-medium">{pendingDrop?.targetMemberName}</span>. 
                Who should receive {pendingDrop?.type === 'group' ? 'these tasks' : 'this task'}?
              </p>
              
              <div className="grid gap-3">
                {applyToOptions.map((option) => (
                  <Button
                    key={option.id}
                    variant="outline"
                    className="justify-start h-auto p-4 bg-white"
                    onClick={() => handleApplyToSelection(option.id)}
                  >
                    <div className="flex items-center space-x-3">
                      {option.icon}
                      <div className="text-left">
                        <div className="font-medium">{option.label}</div>
                        {option.id === 'none' && (
                          <div className="text-xs text-gray-500">Only {pendingDrop?.targetMemberName}</div>
                        )}
                        {option.id === 'all-kids' && (
                          <div className="text-xs text-gray-500">All children</div>
                        )}
                        {option.id === 'all-parents' && (
                          <div className="text-xs text-gray-500">All parents</div>
                        )}
                        {option.id === 'all-family' && (
                          <div className="text-xs text-gray-500">Everyone in the family</div>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
