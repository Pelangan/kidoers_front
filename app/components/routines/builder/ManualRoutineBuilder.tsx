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
import { ArrowLeft, Plus, Trash2, Save, GripVertical, User, Folder, Users, Baby, UserCheck, Check, ChevronLeft, ChevronRight, ListTodo, Settings, Move } from 'lucide-react'
import type { FamilyMember } from '../../../types'

import { apiService, createRoutineDraft, patchRoutine, addRoutineGroup, addRoutineTask, deleteRoutineGroup, deleteRoutineTask, patchRoutineTask, updateOnboardingStep, listLibraryGroups, listLibraryTasks, getOnboardingRoutine, getRoutineGroups, getRoutineTasks, createTaskAssignment, getRoutineAssignments, createRoutineSchedule, generateTaskInstances, getRoutineSchedules, assignGroupTemplateToMembers, assignExistingGroupToMembers, getRoutineFullData, bulkUpdateDayOrders, type DaySpecificOrder, type BulkDayOrderUpdate } from '../../../lib/api'
import { generateAvatarUrl } from '../../ui/AvatarSelector'
import RoutineDetailsModal, { type RoutineScheduleData } from './RoutineDetailsModal'

interface ManualRoutineBuilderProps {
  familyId?: string
  onComplete?: () => void
  isEditMode?: boolean
  onBack?: () => void
}

interface Task {
  id: string
  name: string
  description: string
  points: number
  estimatedMinutes: number
  completed?: boolean
  is_system?: boolean
  time_of_day?: "morning" | "afternoon" | "evening" | "night"
  template_id?: string // Store the original template ID
  is_saved?: boolean // Track if this task has been saved to backend
  memberId?: string // Store the member ID for filtering
  days_of_week?: string[] // Days when this task should appear
  from_group?: { // Track which group this task came from
    id: string
    name: string
    template_id?: string
  }
}

interface TaskGroup {
  id: string
  name: string
  description: string
  tasks: Task[]
  color: string
  is_system?: boolean
  time_of_day?: "morning" | "afternoon" | "evening" | "night"
  template_id?: string // Store the original template ID
  is_saved?: boolean // Track if this group has been saved to backend
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
  targetDay: string
  selectedTasks?: Task[] // For individual task selection within groups
  fromGroup?: TaskGroup // Track which group a task came from
}

interface DaySelection {
  mode: 'single' | 'everyday' | 'custom'
  selectedDays: string[]
}

export default function ManualRoutineBuilder({ familyId: propFamilyId, onComplete, isEditMode = false, onBack }: ManualRoutineBuilderProps = {}) {
  console.log('[KIDOERS-ROUTINE] 🚀 ManualRoutineBuilder: Component mounted with props:', { propFamilyId, isEditMode, hasOnComplete: !!onComplete, hasOnBack: !!onBack });
  console.log('[KIDOERS-ROUTINE] 🔍 Edit Mode Debug - isEditMode value:', isEditMode, 'type:', typeof isEditMode);
  const router = useRouter()
  const sp = useSearchParams()
  const familyId = propFamilyId || sp?.get("family")
  console.log('[KIDOERS-ROUTINE] 🏠 ManualRoutineBuilder: Final familyId:', familyId)
  
  // Debug component lifecycle
  useEffect(() => {
    console.log('[KIDOERS-ROUTINE] ManualRoutineBuilder: Component mounted/updated')
    return () => {
      console.log('[KIDOERS-ROUTINE] ManualRoutineBuilder: Component unmounting')
    }
  }, [])
  
  const [routine, setRoutine] = useState<{ id: string; family_id: string; name: string; status: "draft"|"active"|"archived" }|null>(null)
  const [routineName, setRoutineName] = useState('My Routine')
  const [draggedItem, setDraggedItem] = useState<{ type: 'task' | 'group', item: Task | TaskGroup, fromGroup?: TaskGroup } | null>(null)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(true)
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)
  const [showApplyToPopup, setShowApplyToPopup] = useState(false)
  const [editableTaskName, setEditableTaskName] = useState('')
  const [showOnlyTasks, setShowOnlyTasks] = useState(false)
  const [showOnlyGroups, setShowOnlyGroups] = useState(false)
  const [showTaskMiniPopup, setShowTaskMiniPopup] = useState(false)
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<{ task: Task, day: string, memberId: string } | null>(null)
  const [miniPopupPosition, setMiniPopupPosition] = useState<{ x: number, y: number } | null>(null)
  const [isDeletingTask, setIsDeletingTask] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showRoutineDetails, setShowRoutineDetails] = useState(false)
  const [routineScheduleData, setRoutineScheduleData] = useState<RoutineScheduleData | null>(null)
  const [daySelection, setDaySelection] = useState<DaySelection>({ mode: 'single', selectedDays: [] })
  const [selectedWhoOption, setSelectedWhoOption] = useState<string>('none')
  const [viewMode, setViewMode] = useState<'calendar' | 'group'>('calendar')
  const [selectedTaskGroup, setSelectedTaskGroup] = useState<TaskGroup | null>(null)
  const [showTaskSelection, setShowTaskSelection] = useState(false)
  const [selectedTasksInGroup, setSelectedTasksInGroup] = useState<Task[]>([])

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
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  // Calendar data structure - tasks organized by day
  const [calendarTasks, setCalendarTasks] = useState<Record<string, { groups: TaskGroup[], individualTasks: Task[] }>>({
    'sunday': { groups: [], individualTasks: [] },
    'monday': { groups: [], individualTasks: [] },
    'tuesday': { groups: [], individualTasks: [] },
    'wednesday': { groups: [], individualTasks: [] },
    'thursday': { groups: [], individualTasks: [] },
    'friday': { groups: [], individualTasks: [] },
    'saturday': { groups: [], individualTasks: [] }
  })

  // Color mapping function for family members
  const getMemberColors = (color: string) => {
    const colorMap: Record<string, { border: string; bg: string; bgColor: string; borderColor: string }> = {
      blue: { border: 'border-blue-300', bg: 'bg-blue-50', bgColor: '#dbeafe', borderColor: '#93c5fd' },
      green: { border: 'border-green-300', bg: 'bg-green-50', bgColor: '#dcfce7', borderColor: '#86efac' },
      yellow: { border: 'border-yellow-300', bg: 'bg-yellow-50', bgColor: '#fef3c7', borderColor: '#fde047' },
      orange: { border: 'border-orange-300', bg: 'bg-orange-50', bgColor: '#fed7aa', borderColor: '#fdba74' },
      purple: { border: 'border-purple-300', bg: 'bg-purple-50', bgColor: '#e9d5ff', borderColor: '#c4b5fd' },
      pink: { border: 'border-pink-300', bg: 'bg-pink-50', bgColor: '#fce7f3', borderColor: '#f9a8d4' },
      teal: { border: 'border-teal-300', bg: 'bg-teal-50', bgColor: '#ccfbf1', borderColor: '#5eead4' },
      indigo: { border: 'border-indigo-300', bg: 'bg-indigo-50', bgColor: '#e0e7ff', borderColor: '#a5b4fc' }
    }
    return colorMap[color] || { border: 'border-gray-300', bg: 'bg-gray-50', bgColor: '#f9fafb', borderColor: '#d1d5db' }
  }

  // Load all initial data (family members, existing routine, and library data)
  useEffect(() => {
    let isMounted = true;
    
    const loadAllData = async () => {
      if (!familyId) {
        console.log('[KIDOERS-ROUTINE] ⚠️ ManualRoutineBuilder: No familyId, redirecting to onboarding');
        router.push("/onboarding"); // safety
        return;
      }
      
      // Prevent duplicate calls
      if (isLoadingData) {
        console.log('[KIDOERS-ROUTINE] ⏸️ ManualRoutineBuilder: Already loading data, skipping duplicate call');
        return;
      }
      
      console.log('[KIDOERS-ROUTINE] 🚀 ManualRoutineBuilder: Starting loadAllData, familyId:', familyId, 'isEditMode:', isEditMode);
      setIsLoadingData(true);
      
      setBusy(true);
      setLibraryLoading(true);
      setError(null);
      
      try {
        console.log('[KIDOERS-ROUTINE] Starting to load all data for family:', familyId);
        
        // Check current onboarding step and only update if needed (skip in edit mode)
        if (!isEditMode) {
          console.log('[KIDOERS-ROUTINE] ManualRoutineBuilder: Checking current onboarding step...');
          try {
            const onboardingStatus = await apiService.getOnboardingStatus();
            console.log('[KIDOERS-ROUTINE] Current onboarding status:', onboardingStatus);
            
            if (onboardingStatus.has_family && onboardingStatus.in_progress) {
              const currentStep = onboardingStatus.in_progress.setup_step;
              console.log('[KIDOERS-ROUTINE] Current step:', currentStep);
              
              if (currentStep !== 'create_routine') {
                console.log('[KIDOERS-ROUTINE] Updating step from', currentStep, 'to create_routine');
                await updateOnboardingStep(familyId, "create_routine");
                console.log('[KIDOERS-ROUTINE] ManualRoutineBuilder: Onboarding step updated successfully');
              } else {
                console.log('[KIDOERS-ROUTINE] Step already set to create_routine, skipping update');
              }
            } else {
              console.log('[KIDOERS-ROUTINE] No onboarding in progress, updating step to create_routine');
              await updateOnboardingStep(familyId, "create_routine");
              console.log('[KIDOERS-ROUTINE] ManualRoutineBuilder: Onboarding step updated successfully');
            }
          } catch (error) {
            console.log('[KIDOERS-ROUTINE] ManualRoutineBuilder: Error checking/updating step:', error);
          }
        } else {
          console.log('[KIDOERS-ROUTINE] ManualRoutineBuilder: In edit mode, skipping onboarding step update');
        }
        
        // Load all data concurrently
        console.log('[KIDOERS-ROUTINE] 🔄 ManualRoutineBuilder: Starting concurrent API calls...');
        console.log('[KIDOERS-ROUTINE] 📞 ManualRoutineBuilder: Calling getFamilyMembers()');
        console.log('[KIDOERS-ROUTINE] 📞 ManualRoutineBuilder: Calling listLibraryGroups()');
        console.log('[KIDOERS-ROUTINE] 📞 ManualRoutineBuilder: Calling listLibraryTasks()');
        
        const [members, groupsData, tasksData] = await Promise.all([
          apiService.getFamilyMembers(familyId),
          listLibraryGroups('', true),
          listLibraryTasks('')
        ]);
        
        console.log('[KIDOERS-ROUTINE] ✅ ManualRoutineBuilder: All API data loaded:', { 
          membersCount: members?.length || 0, 
          groupsCount: groupsData?.length || 0, 
          tasksCount: tasksData?.length || 0 
        });
        
        // Try to load existing routine (onboarding routine first, then active routine)
        let existingRoutine = null;
        try {
          // First, try to load the onboarding routine (draft status with is_onboarding_routine = true)
          if (!isEditMode) {
            console.log('[KIDOERS-ROUTINE] 📋 ManualRoutineBuilder: Loading onboarding routine for family...');
            try {
              const onboardingRoutine = await getOnboardingRoutine(familyId);
              if (onboardingRoutine) {
                console.log('[KIDOERS-ROUTINE] ✅ ManualRoutineBuilder: Onboarding routine found:', onboardingRoutine);
                existingRoutine = onboardingRoutine;
              }
            } catch (e: any) {
              console.log('[KIDOERS-ROUTINE] No onboarding routine found (expected for new users):', e.message);
            }
          }
          
          // If no onboarding routine found, try to load active routine
          if (!existingRoutine) {
            console.log('[KIDOERS-ROUTINE] 📋 ManualRoutineBuilder: Loading existing routines for family...');
            console.log('[KIDOERS-ROUTINE] 📞 ManualRoutineBuilder: Calling /routines?family_id=' + familyId);
            const routines = await apiService.makeRequest<any[]>(`/routines?family_id=${familyId}`);
            console.log('[KIDOERS-ROUTINE] ✅ ManualRoutineBuilder: Routines found:', routines?.length || 0, 'routines');
            
            // Find the active routine
            existingRoutine = routines.find(r => r.status === 'active');
          }
          
          if (existingRoutine) {
            console.log('[KIDOERS-ROUTINE] Routine found:', existingRoutine);
            setRoutine({
              id: existingRoutine.id,
              family_id: existingRoutine.family_id,
              name: existingRoutine.name,
              status: existingRoutine.status as "draft"|"active"|"archived"
            });
            setRoutineName(existingRoutine.name);
            
            // Mark as having no unsaved changes since we just loaded the routine
            setHasUnsavedChanges(false);
          } else {
            console.log('[KIDOERS-ROUTINE] No existing routine found, will create new one when needed');
          }
        } catch (e: any) {
          console.warn('[KIDOERS-ROUTINE] ','Error loading routines:', e);
        }
        
        // Convert API response to FamilyMember type and set family members
        const convertedMembers: FamilyMember[] = members.map((member: any) => ({
          id: member.id,
          name: member.name,
          role: member.role,
          color: member.color,
          age: member.age,
          avatar_url: member.avatar_url,
          avatar_style: member.avatar_style,
          avatar_seed: member.avatar_seed,
          avatar_options: typeof member.avatar_options === 'string' 
            ? JSON.parse(member.avatar_options || '{}') 
            : member.avatar_options || {},
          calmMode: false, // Default value
          textToSpeech: false, // Default value
          // Backward compatibility fields
          avatarStyle: member.avatar_style,
          avatarOptions: typeof member.avatar_options === 'string' 
            ? JSON.parse(member.avatar_options || '{}') 
            : member.avatar_options || {},
          avatarUrl: member.avatar_url
        }))
        
        setFamilyMembers(convertedMembers);
        
        // Enhance family members with the structure needed for the routine builder
        const enhanced = convertedMembers.map((member) => {
          const colors = getMemberColors(member.color)
          
          return {
            id: member.id,
            name: member.name,
            type: member.role,
            color: member.color, // Keep original color for avatar generation
            avatar_url: member.avatar_url,
            avatar_style: member.avatar_style,
            avatar_seed: member.avatar_seed,
            avatar_options: member.avatar_options,
            borderColor: colors.border,
            taskBgColor: colors.bg,
            groups: [],
            individualTasks: []
          }
        })
        setEnhancedFamilyMembers(enhanced)
        console.log('[KIDOERS-ROUTINE] Enhanced family members loaded:', enhanced)
        
        // Set the first family member as selected by default
        if (enhanced.length > 0 && !selectedMemberId) {
          setSelectedMemberId(enhanced[0].id)
          console.log('[KIDOERS-ROUTINE] Set default selected member:', enhanced[0].id, enhanced[0].name)
        }
        
        // Load existing routine data after enhanced family members are set
        if (existingRoutine) {
          await loadExistingRoutineData(existingRoutine.id, enhanced);
        }
        
        // Transform and set library data
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
        
        console.log('[KIDOERS-ROUTINE] All data loaded successfully');
      } catch (e: any) {
        console.error('[KIDOERS-ROUTINE] ','Error loading data:', e);
        setError(e?.message || "Failed to load data");
      } finally {
        if (isMounted) {
          setBusy(false);
          setLibraryLoading(false);
          setIsLoadingData(false);
        }
      }
    }

    loadAllData()
    
    return () => {
      console.log('[KIDOERS-ROUTINE] 🧹 ManualRoutineBuilder: useEffect cleanup - setting isMounted = false');
      isMounted = false;
    }
  }, [familyId]) // Removed router dependency to prevent unnecessary re-runs



  // Library data from API
  const [libraryGroups, setLibraryGroups] = useState<TaskGroup[]>([])
  const [libraryTasks, setLibraryTasks] = useState<Task[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)

  // Task reordering state (only in edit mode)
  const [draggedTask, setDraggedTask] = useState<{task: Task, day: string, memberId: string} | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<{day: string, memberId: string, position: 'before' | 'after', targetTaskId?: string} | null>(null)
  const [dayOrders, setDayOrders] = useState<DaySpecificOrder[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [currentRoutineId, setCurrentRoutineId] = useState<string | null>(null)

  // Update body class when dragging
  useEffect(() => {
    console.log('[CURSOR-DEBUG] isDragging changed to:', isDragging)
    if (isDragging) {
      document.body.classList.add('dragging')
      document.body.style.cursor = 'move'
      console.log('[CURSOR-DEBUG] Added dragging class to body and set cursor to move')
    } else {
      document.body.classList.remove('dragging')
      document.body.style.cursor = ''
      console.log('[CURSOR-DEBUG] Removed dragging class from body and reset cursor')
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('dragging')
      document.body.style.cursor = ''
    }
  }, [isDragging])

  // Pre-defined task groups (now using API data)
  const [predefinedGroups] = useState<TaskGroup[]>([])

  // Pre-defined individual tasks (now using API data)
  const [predefinedTasks] = useState<Task[]>([])



  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'task' | 'group', item: Task | TaskGroup, fromGroup?: TaskGroup) => {
    console.log('[DRAG-ORDER] Drag started:', { type, item: item.name, fromGroup: fromGroup?.name })
    setDraggedItem({ type, item, fromGroup })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDropOnDay = async (e: React.DragEvent, day: string) => {
    e.preventDefault()
    console.log('[DRAG-ORDER] Drop on day:', { day, draggedItem, draggedTask, selectedMemberId })
    
    // Handle existing task being moved between columns
    if (draggedTask) {
      console.log('[DRAG-ORDER] Moving existing task between columns:', draggedTask.task.name, 'from', draggedTask.day, 'to', day)
      
      if (draggedTask.day === day) {
        console.log('[DRAG-ORDER] Task dropped on same day, no action needed')
        setDraggedTask(null)
        setIsDragging(false)
        return
      }

      try {
        // Move task to new day
        await moveTaskToNewDay(draggedTask.task, draggedTask.day, day, draggedTask.memberId)
        console.log('[DRAG-ORDER] ✅ Task moved between columns successfully')
      } catch (error) {
        console.error('[DRAG-ORDER] ❌ Error moving task between columns:', error)
        setError('Failed to move task. Please try again.')
      }
      
      setDraggedTask(null)
      setIsDragging(false)
      return
    }
    
    // Handle new task from library
    if (!draggedItem || !selectedMemberId) {
      console.log('[DRAG-ORDER] No dragged item or selected member:', { draggedItem, selectedMemberId })
      return
    }

    const member = enhancedFamilyMembers.find(m => m.id === selectedMemberId)
    if (!member) {
      console.log('[KIDOERS-ROUTINE] Member not found:', selectedMemberId)
      return
    }

    // If it's a group, show task selection first
    if (draggedItem.type === 'group') {
      console.log('[DRAG-ORDER] Group dropped, showing task selection')
      const group = draggedItem.item as TaskGroup
      setSelectedTaskGroup(group)
      setSelectedTasksInGroup([])
      setShowTaskSelection(true)
      setDraggedItem(null)
      return
    }

    // Gmail-style: Create task immediately with default settings
    console.log('[DRAG-ORDER] Creating task immediately:', draggedItem.item)
    try {
      const task = draggedItem.item as Task
      
      // Create task with default "this member only" and "just this day" settings
      await addTaskToCalendar(selectedMemberId, task, 'none', day)
      
      console.log('[DRAG-ORDER] ✅ Task created successfully')
    } catch (error) {
      console.error('[DRAG-ORDER] ❌ Error creating task:', error)
      setError('Failed to create task. Please try again.')
    }
    
    setDraggedItem(null)
  }

  // Move task to a new day (cross-column dragging)
  const moveTaskToNewDay = async (task: Task, fromDay: string, toDay: string, memberId: string) => {
    console.log('[MOVE-TASK] Moving task:', task.name, 'from', fromDay, 'to', toDay)
    
    try {
      // Get routine ID
      const routineData = await ensureRoutineExists()
      if (!routineData) {
        setError('Failed to get routine information. Please try again.')
        return
      }

      // Update task in backend to new day
      console.log('[MOVE-TASK] 🗑️ Updating task in backend to new day:', toDay)
      await patchRoutineTask(routineData.id, task.id, { days_of_week: [toDay] })
      console.log('[MOVE-TASK] ✅ Task updated in backend successfully')

      // Update UI state
      setCalendarTasks(prev => {
        const newCalendarTasks = { ...prev }
        
        // Remove from source day
        newCalendarTasks[fromDay] = {
          ...newCalendarTasks[fromDay],
          individualTasks: newCalendarTasks[fromDay].individualTasks.filter(t => t.id !== task.id)
        }
        
        // Add to target day
        newCalendarTasks[toDay] = {
          ...newCalendarTasks[toDay],
          individualTasks: [...newCalendarTasks[toDay].individualTasks, {
            ...task,
            days_of_week: [toDay] // Update the task's days
          }]
        }
        
        // Update day orders for the move with the new task order
        const finalTaskOrder = newCalendarTasks[toDay].individualTasks.filter(t => t.memberId === memberId)
        updateDayOrdersForTaskMove(task, fromDay, memberId, toDay, memberId, finalTaskOrder)
        
        return newCalendarTasks
      })
      
      console.log('[MOVE-TASK] ✅ Task moved successfully')
    } catch (error) {
      console.error('[MOVE-TASK] ❌ Error moving task:', error)
      throw error
    }
  }

  // Handle task click for mini popup
  const handleTaskClick = (e: React.MouseEvent, task: Task, day: string, memberId: string) => {
    e.stopPropagation()
    console.log('[TASK-CLICK] Task clicked:', task.name, 'showTaskMiniPopup:', showTaskMiniPopup, 'isDeletingTask:', isDeletingTask)
    
    // Prevent opening popup if it's already open or if we're deleting
    if (showTaskMiniPopup || isDeletingTask) {
      console.log('[TASK-CLICK] Popup already open or deleting, ignoring click')
      return
    }
    
    // Add a small delay to prevent rapid clicks
    setTimeout(() => {
      if (!showTaskMiniPopup && !isDeletingTask) {
        console.log('[TASK-CLICK] Opening popup after delay')
        setSelectedTaskForEdit({ task, day, memberId })
        setMiniPopupPosition({ x: e.clientX, y: e.clientY })
        setShowTaskMiniPopup(true)
      }
    }, 50)
  }

  // Handle column click to create new task
  const handleColumnClick = async (day: string) => {
    if (!selectedMemberId) return
    
    console.log('[KIDOERS-ROUTINE] Column clicked for day:', day)
    
    try {
      // Create a new task with no title placeholder
      const newTask: Task = {
        id: `temp-${Date.now()}`,
        name: '(No title)',
        description: '',
        points: 5, // Default points
        estimatedMinutes: 30, // Default duration
        time_of_day: 'morning', // Default time
        is_saved: false
      }
      
      // Add to calendar immediately
      const updatedCalendarTasks = { ...calendarTasks }
      if (!updatedCalendarTasks[day]) {
        updatedCalendarTasks[day] = { groups: [], individualTasks: [] }
      }
      updatedCalendarTasks[day].individualTasks.push(newTask)
      setCalendarTasks(updatedCalendarTasks)
      
      // Save to backend
      await addTaskToCalendar(selectedMemberId, newTask, 'none', day)
      
      console.log('[KIDOERS-ROUTINE] New task created for day:', day)
    } catch (error) {
      console.error('[KIDOERS-ROUTINE] Error creating new task:', error)
    }
  }

  // Handle edit task - opens the Apply Tasks To modal
  const handleEditTask = () => {
    if (!selectedTaskForEdit) return
    
    console.log('[TASK-EDIT] Opening edit modal for task:', selectedTaskForEdit.task.name)
    
    // Set up the task for editing
    setPendingDrop({
      type: 'task',
      item: selectedTaskForEdit.task,
      targetMemberId: selectedTaskForEdit.memberId,
      targetMemberName: enhancedFamilyMembers.find(m => m.id === selectedTaskForEdit.memberId)?.name || '',
      targetDay: selectedTaskForEdit.day,
      fromGroup: undefined
    })
    
    // Initialize day selection with the task's current day
    setDaySelection({ mode: 'single', selectedDays: [selectedTaskForEdit.day] })
    
    // Close mini popup and open main modal
    setShowTaskMiniPopup(false)
    setSelectedWhoOption('none') // Reset to default selection
    setEditableTaskName(selectedTaskForEdit.task.name)
    setShowApplyToPopup(true)
  }

  // Handle delete task
  const handleDeleteTask = async () => {
    if (!selectedTaskForEdit) return
    
    console.log('[TASK-DELETE] Deleting task:', selectedTaskForEdit.task.name)
    
    // Set deleting flag to prevent any popup from opening
    setIsDeletingTask(true)
    
    // Store task info before clearing state
    const taskToDelete = selectedTaskForEdit
    
    // Close mini popup first to prevent any race conditions
    setShowTaskMiniPopup(false)
    setSelectedTaskForEdit(null)
    setMiniPopupPosition(null)
    
    // Small delay to ensure popup is closed before removing task
    setTimeout(async () => {
      try {
        // Get routine ID for backend deletion
        const routineData = await ensureRoutineExists()
        if (!routineData) {
          setError('Failed to get routine information. Please try again.')
          return
        }

        // Delete task from backend
        console.log('[TASK-DELETE] 🗑️ Deleting task from backend:', taskToDelete.task.id)
        await deleteRoutineTask(routineData.id, taskToDelete.task.id)
        console.log('[TASK-DELETE] ✅ Task deleted from backend successfully')

        // Remove from calendar state
        setCalendarTasks(prev => ({
          ...prev,
          [taskToDelete.day]: {
            ...prev[taskToDelete.day],
            individualTasks: prev[taskToDelete.day].individualTasks.filter(t => t.id !== taskToDelete.task.id)
          }
        }))
        
        console.log('[TASK-DELETE] ✅ Task deleted from UI successfully')
      } catch (error) {
        console.error('[TASK-DELETE] ❌ Error deleting task:', error)
        setError('Failed to delete task. Please try again.')
      } finally {
        // Reset deleting flag after a longer delay
        setTimeout(() => {
          setIsDeletingTask(false)
        }, 500)
      }
    }, 100) // Small delay to ensure popup is closed
  }

  const handleApplyToSelection = async (applyToId?: string) => {
    const selectedApplyToId = applyToId || selectedWhoOption
    console.log('[KIDOERS-ROUTINE] 🚀 handleApplyToSelection called with applyToId:', selectedApplyToId)
    
    if (!pendingDrop) {
      console.log('[DRAG-ORDER] ❌ No pending drop found')
      return
    }

    console.log('[KIDOERS-ROUTINE] 📋 Applying task/group:', {
      type: pendingDrop.type,
      item: pendingDrop.item,
      targetMemberId: pendingDrop.targetMemberId,
      applyToId: selectedApplyToId,
      daySelection
    })

    // Determine which days to add the task to based on day selection
    let targetDays: string[] = []
    
    if (daySelection.mode === 'single') {
      targetDays = [pendingDrop.targetDay]
    } else if (daySelection.mode === 'everyday') {
      targetDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    } else if (daySelection.mode === 'custom') {
      targetDays = daySelection.selectedDays
    }

    console.log('[KIDOERS-ROUTINE] Target days:', targetDays)

    // Determine which members should receive the task based on applyToId
    let targetMemberIds: string[] = []
    
    console.log('[KIDOERS-ROUTINE] 🔍 Assignment Debug Info:')
    console.log('[KIDOERS-ROUTINE] - applyToId:', selectedApplyToId)
    console.log('[KIDOERS-ROUTINE] - enhancedFamilyMembers:', enhancedFamilyMembers)
    console.log('[KIDOERS-ROUTINE] - Member roles:', enhancedFamilyMembers.map(m => ({ id: m.id, name: m.name, role: m.role })))
    console.log('[KIDOERS-ROUTINE] - Full member details:', enhancedFamilyMembers.map(m => ({ 
      id: m.id, 
      name: m.name, 
      role: m.role, 
      type: m.type,
      allFields: Object.keys(m),
      memberObject: m
    })))
    
    if (selectedApplyToId === 'none') {
      // Only the member the task was dropped on
      targetMemberIds = [pendingDrop.targetMemberId]
      console.log('[KIDOERS-ROUTINE] - Selected: This member only, targetMemberIds:', targetMemberIds)
    } else if (selectedApplyToId === 'all-kids') {
      // All children in the family
      const kids = enhancedFamilyMembers.filter(member => member.type === 'child')
      targetMemberIds = kids.map(member => member.id)
      console.log('[KIDOERS-ROUTINE] - Selected: All kids')
      console.log('[KIDOERS-ROUTINE] - Kids found:', kids)
      console.log('[KIDOERS-ROUTINE] - Kids IDs:', targetMemberIds)
    } else if (selectedApplyToId === 'all-parents') {
      // All parents in the family
      const parents = enhancedFamilyMembers.filter(member => member.type === 'parent')
      targetMemberIds = parents.map(member => member.id)
      console.log('[KIDOERS-ROUTINE] - Selected: All parents')
      console.log('[KIDOERS-ROUTINE] - Parents found:', parents)
      console.log('[KIDOERS-ROUTINE] - Parents IDs:', targetMemberIds)
    } else if (selectedApplyToId === 'all-family') {
      // All family members
      targetMemberIds = enhancedFamilyMembers.map(member => member.id)
      console.log('[KIDOERS-ROUTINE] - Selected: All family, targetMemberIds:', targetMemberIds)
    } else {
      // Fallback to single member
      targetMemberIds = [pendingDrop.targetMemberId]
      console.log('[KIDOERS-ROUTINE] - Fallback: Single member, targetMemberIds:', targetMemberIds)
    }
    
    console.log('[KIDOERS-ROUTINE] Target members for applyToId:', selectedApplyToId, targetMemberIds)

    // Add task/group to all selected days for all target members (only UI updates, no backend calls)
    for (const day of targetDays) {
      for (const memberId of targetMemberIds) {
        if (pendingDrop.type === 'task') {
          console.log('[KIDOERS-ROUTINE] ',`Adding task to ${day} for member ${memberId}`)
          // Update task name with editable name
          const updatedTask = { ...pendingDrop.item as Task, name: editableTaskName }
          addTaskToCalendar(memberId, updatedTask, selectedApplyToId, day, pendingDrop.fromGroup)
        } else if (pendingDrop.type === 'group') {
          console.log('[KIDOERS-ROUTINE] ',`Adding group to ${day} for member ${memberId}`)
          addGroupToCalendar(memberId, pendingDrop.item as TaskGroup, selectedApplyToId, day, pendingDrop.selectedTasks)
        }
      }
    }

    // Close popup and reset
    setShowApplyToPopup(false)
    setPendingDrop(null)
    setDaySelection({ mode: 'single', selectedDays: [] })
    setSelectedWhoOption('none')
    setEditableTaskName('')
  }

  const handleTaskSelection = (task: Task, isSelected: boolean) => {
    if (isSelected) {
      setSelectedTasksInGroup(prev => [...prev, task])
    } else {
      setSelectedTasksInGroup(prev => prev.filter(t => t.id !== task.id))
    }
  }

  const handleSelectAllTasks = () => {
    if (selectedTaskGroup) {
      setSelectedTasksInGroup(selectedTaskGroup.tasks)
    }
  }

  const handleDeselectAllTasks = () => {
    setSelectedTasksInGroup([])
  }

  const handleConfirmTaskSelection = () => {
    if (!selectedTaskGroup || selectedTasksInGroup.length === 0 || !selectedMemberId) return

    const member = enhancedFamilyMembers.find(m => m.id === selectedMemberId)
    if (!member) return

    // Set up pending drop with selected tasks - we'll get the day from the drag operation
    setPendingDrop({
      type: 'group',
      item: selectedTaskGroup,
      targetMemberId: selectedMemberId,
      targetMemberName: member.name,
      targetDay: 'monday', // Default day, will be updated when user selects days
      selectedTasks: selectedTasksInGroup
    })
    
    // Initialize day selection
    setDaySelection({ mode: 'single', selectedDays: [] })
    
    setShowTaskSelection(false)
    setSelectedWhoOption('none') // Reset to default selection
    setEditableTaskName(pendingDrop?.item.name || '')
    setShowApplyToPopup(true)
  }

  // Task reordering handlers (works in both edit mode and normal mode)
  const handleTaskDragStart = (e: React.DragEvent, task: Task, day: string, memberId: string) => {
    console.log('[DRAG-ORDER] 🚀 DRAG START EVENT TRIGGERED!', { task: task.name, day, memberId })
    console.log('[DRAG-ORDER] 🔧 DEBUG: handleTaskDragStart called with:', { task, day, memberId })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', '')
    
    // Set cursor directly on the event
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.cursor = 'move'
    }
    
    setDraggedTask({ task, day, memberId })
    setIsDragging(true)
    console.log('[DRAG-ORDER] ✅ Started dragging task:', task.name, 'from day:', day, 'member:', memberId)
    console.log('[CURSOR-DEBUG] Set isDragging to true')
  }

  const handleTaskDragOver = (e: React.DragEvent, day: string, memberId: string, position: 'before' | 'after', targetTaskId?: string) => {
    if (!draggedTask) return
    
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    const newDragOverPosition = { day, memberId, position, targetTaskId }
    
    // Only log when position actually changes to reduce noise
    if (!dragOverPosition || 
        dragOverPosition.day !== newDragOverPosition.day ||
        dragOverPosition.memberId !== newDragOverPosition.memberId ||
        dragOverPosition.position !== newDragOverPosition.position ||
        dragOverPosition.targetTaskId !== newDragOverPosition.targetTaskId) {
      console.log('[DRAG-ORDER] 🎯 Drag over position:', newDragOverPosition)
    }
    
    setDragOverPosition(newDragOverPosition)
  }

  const handleTaskDragLeave = () => {
    setDragOverPosition(null)
  }

  const handleTaskDrop = async (e: React.DragEvent, targetDay: string, targetMemberId: string) => {
    if (!draggedTask) {
      console.log('[DRAG-ORDER] ❌ No dragged task on drop')
      return
    }
    
    e.preventDefault()
    
    const { task, day: sourceDay, memberId: sourceMemberId } = draggedTask
    
    console.log('[DRAG-ORDER] 🎯 Task dropped:', {
      task: task.name,
      sourceDay,
      sourceMemberId,
      targetDay,
      targetMemberId,
      dragOverPosition
    })
    
    // Don't reorder if dropped in the same position AND no drag over position is specified
    if (sourceDay === targetDay && sourceMemberId === targetMemberId && (!dragOverPosition || !dragOverPosition.targetTaskId)) {
      console.log('[DRAG-ORDER] ⚠️ Dropped in same position with no specific target, no reorder needed')
      setDraggedTask(null)
      setDragOverPosition(null)
      return
    }

    // Move the task to the new position
    console.log('[DRAG-ORDER] ✅ Proceeding with reorder - dragOverPosition:', dragOverPosition)
    await moveTaskToPosition(task, sourceDay, sourceMemberId, targetDay, targetMemberId, dragOverPosition)
    
    setDraggedTask(null)
    setDragOverPosition(null)
  }

  const moveTaskToPosition = async (task: Task, sourceDay: string, sourceMemberId: string, targetDay: string, targetMemberId: string, currentDragOverPosition: any) => {
    console.log('[KIDOERS-ROUTINE] 🔄 moveTaskToPosition called:', {
      task: task.name,
      sourceDay,
      sourceMemberId,
      targetDay,
      targetMemberId,
      currentDragOverPosition
    })

    let finalTaskOrder: Task[] = []

    setCalendarTasks(prev => {
      const newCalendarTasks = { ...prev }
      
      // Find and remove task from source position
      const sourceDayTasks = newCalendarTasks[sourceDay]
      const sourceTaskIndex = sourceDayTasks.individualTasks.findIndex((t: Task) => t.id === task.id)
      
      if (sourceTaskIndex === -1) {
        console.log('[KIDOERS-ROUTINE] ❌ Task not found in source position')
        return newCalendarTasks
      }
      
      // Remove task from source
      const [movedTask] = sourceDayTasks.individualTasks.splice(sourceTaskIndex, 1)
      console.log('[KIDOERS-ROUTINE] ✅ Removed task from source at index:', sourceTaskIndex)
      
      // Add task to target position
      const targetDayTasks = newCalendarTasks[targetDay]
      
      if (currentDragOverPosition && currentDragOverPosition.targetTaskId && currentDragOverPosition.day === targetDay) {
        // Insert at specific position
        const targetIndex = targetDayTasks.individualTasks.findIndex((t: Task) => t.id === currentDragOverPosition.targetTaskId)
        if (targetIndex !== -1) {
          const insertIndex = currentDragOverPosition.position === 'before' ? targetIndex : targetIndex + 1
          targetDayTasks.individualTasks.splice(insertIndex, 0, movedTask)
          console.log('[KIDOERS-ROUTINE] ✅ Inserted task at specific position:', insertIndex)
        } else {
          targetDayTasks.individualTasks.push(movedTask)
          console.log('[KIDOERS-ROUTINE] ✅ Added task to end (target not found)')
        }
      } else {
        // Add to end
        targetDayTasks.individualTasks.push(movedTask)
        console.log('[KIDOERS-ROUTINE] ✅ Added task to end (no specific position)')
      }
      
      // Store the final task order for the target day and member
      finalTaskOrder = targetDayTasks.individualTasks.filter((t: Task) => {
        const taskMemberId = t.memberId || extractMemberIdFromId(t.id);
        return taskMemberId === targetMemberId;
      });
      
      console.log('[DRAG-ORDER] 📊 Final task order for', targetDay, ':', finalTaskOrder.map(t => t.name))
      
      return newCalendarTasks
    })

    // Update day orders with the calculated final order
    updateDayOrdersForTaskMove(task, sourceDay, sourceMemberId, targetDay, targetMemberId, finalTaskOrder)
  }

  // Update day orders when tasks are moved and save immediately to backend
  const updateDayOrdersForTaskMove = async (task: Task, sourceDay: string, sourceMemberId: string, targetDay: string, targetMemberId: string, finalTaskOrder: Task[]) => {
    console.log('[DRAG-ORDER] 🔄 Updating day orders for task move:', {
      task: task.name,
      sourceDay,
      sourceMemberId,
      targetDay,
      targetMemberId,
      finalTaskOrder: finalTaskOrder.map(t => t.name)
    })

    try {
      // Ensure routine exists
      const routineData = await ensureRoutineExists();
      if (!routineData) {
        console.error('[DRAG-ORDER] ❌ No routine found for saving day orders');
        return;
      }

      // Check if the moved task is in the final order
      const targetTaskIndex = finalTaskOrder.findIndex((t: Task) => t.id === task.id)
      
      if (targetTaskIndex === -1) {
        console.log('[DRAG-ORDER] ⚠️ Task not found in final order, skipping order update');
        return;
      }

      // Create day order entries for all tasks in the target day
      const dayOrdersToSave: DaySpecificOrder[] = finalTaskOrder.map((t: Task, index: number) => ({
        id: `temp-${Date.now()}-${Math.random()}`,
        routine_id: routineData.id,
        member_id: targetMemberId,
        day_of_week: targetDay,
        routine_task_id: t.id,
        order_index: index,
        created_at: new Date().toISOString()
      }));

      // Group by member and day for bulk update
      const bulkUpdate: BulkDayOrderUpdate = {
        member_id: targetMemberId,
        day_of_week: targetDay,
        task_orders: dayOrdersToSave.map(order => ({
          routine_task_id: order.routine_task_id,
          order_index: order.order_index
        }))
      };

      console.log('[DRAG-ORDER] 📤 Saving day orders immediately:', bulkUpdate);
      await bulkUpdateDayOrders(routineData.id, bulkUpdate);
      console.log('[DRAG-ORDER] ✅ Day orders saved successfully');

      // Update local state to reflect the saved orders
      setDayOrders(prev => {
        const newDayOrders = [...prev]
        
        // Remove existing order entries for this member/day combination
        const filteredOrders = newDayOrders.filter(order => 
          !(order.member_id === targetMemberId && order.day_of_week === targetDay)
        )
        
        // Add the new orders
        filteredOrders.push(...dayOrdersToSave);
        
        console.log('[DRAG-ORDER] 📊 Updated local day orders for', targetDay, ':', dayOrdersToSave.map(o => ({ taskId: o.routine_task_id, order: o.order_index })))
        
        return filteredOrders
      });

    } catch (error) {
      console.error('[DRAG-ORDER] ❌ Error saving day orders:', error);
      // Don't show error to user for drag operations, just log it
    }
  }

  // Get day-specific order for tasks
  const getTasksWithDayOrder = (tasks: Task[], day: string, memberId: string): Task[] => {
    if (!dayOrders.length) {
      return tasks
    }

    // Find day-specific orders for this member/day
    const memberDayOrders = dayOrders.filter(order => 
      order.member_id === memberId && order.day_of_week === day
    )

    if (!memberDayOrders.length) {
      return tasks
    }

    // Sort tasks by day-specific order
    const sortedTasks = [...tasks].sort((a, b) => {
      const orderA = memberDayOrders.find(order => order.routine_task_id === a.id)?.order_index ?? 999
      const orderB = memberDayOrders.find(order => order.routine_task_id === b.id)?.order_index ?? 999
      return orderA - orderB
    })

    console.log('[DRAG-ORDER] 📋 Sorted tasks by day order:', { day, memberId, tasks: sortedTasks.map(t => t.name) })
    return sortedTasks
  }

  // Save day-specific order to backend
  const saveDaySpecificOrder = async (day: string, memberId: string, tasks: Task[]) => {
    if (!currentRoutineId) {
      console.log('[DRAG-ORDER] ❌ No routine ID for saving day-specific order')
      return
    }

    try {
      console.log('[DRAG-ORDER] 💾 Saving day-specific order for:', { day, memberId, tasks: tasks.map(t => t.name) })
      
      const taskOrders = tasks.map((task, index) => ({
        routine_task_id: extractRoutineTaskIdFromId(task.id),
        order_index: index
      }))

      console.log('[DRAG-ORDER] 🔍 Task order mapping:', {
        originalTaskIds: tasks.map(t => t.id),
        extractedRoutineTaskIds: taskOrders.map(to => to.routine_task_id),
        taskNames: tasks.map(t => t.name)
      })

      const bulkUpdate: BulkDayOrderUpdate = {
        member_id: memberId,
        day_of_week: day,
        task_orders: taskOrders
      }

      const updatedOrders = await bulkUpdateDayOrders(currentRoutineId, bulkUpdate)
      console.log('[DRAG-ORDER] ✅ Day-specific order saved:', updatedOrders)
      
      // Update local day orders state
      setDayOrders(prev => {
        // Remove existing orders for this member/day
        const filtered = prev.filter(order => 
          !(order.member_id === memberId && order.day_of_week === day)
        )
        // Add new orders
        return [...filtered, ...updatedOrders]
      })
      
    } catch (error) {
      console.error('[DRAG-ORDER] ❌ Failed to save day-specific order:', error)
      // TODO: Show user-friendly error message
    }
  }

  // UI-only function for adding groups to calendar (no backend calls)
  const addGroupToCalendarUI = (memberId: string, group: TaskGroup, applyTo: string, day: string, selectedTasks?: Task[]) => {

    // If specific tasks are selected, create a group with only those tasks
    const groupToAdd = selectedTasks && selectedTasks.length > 0 
      ? { ...group, tasks: selectedTasks }
      : group

    // Add group to calendar for the specified day
    setCalendarTasks(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        groups: [...prev[day].groups, { 
          ...groupToAdd, 
          id: `${group.id}-${memberId}-${day}-${Date.now()}`,
          template_id: group.id, // Store the original template ID
          is_saved: false // Mark as unsaved
        }]
      }
    }))
    
    // Day orders are now saved immediately when dragging, no need to track unsaved changes
  }

  const addGroupToCalendar = async (memberId: string, group: TaskGroup, applyTo: string, day: string, routineData?: any) => {
    // Don't create routine yet - just add to local state
    // Routine will be created when user clicks "Save Progress"
    
    const applyToOption = applyToOptions.find(option => option.id === applyTo)
    if (!applyToOption) return

    const targetMembers = applyTo === 'none' 
      ? enhancedFamilyMembers.filter(m => m.id === memberId)
      : applyToOption.filter(enhancedFamilyMembers)

    // Add group to calendar for the specified day
    setCalendarTasks(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        groups: [...prev[day].groups, { 
          ...group, 
          id: `${group.id}-${memberId}-${day}-${Date.now()}`,
          template_id: group.id // Store the original template ID
        }]
      }
    }))
    
    // Day orders are now saved immediately when dragging, no need to track unsaved changes
  }

  // UI-only function for adding tasks to calendar (no backend calls)
  const addTaskToCalendarUI = (memberId: string, task: Task, applyTo: string, day: string, fromGroup?: TaskGroup) => {
    console.log('[KIDOERS-ROUTINE] addTaskToCalendarUI called:', { memberId, task: task.name, applyTo, day, fromGroup })

    const newTaskId = `${task.id}-${memberId}-${day}-${Date.now()}`
    console.log('[KIDOERS-ROUTINE] Creating new task with ID:', newTaskId)

    // Add task to calendar for the specified day
    setCalendarTasks(prev => {
      const newState = {
      ...prev,
      [day]: {
        ...prev[day],
        individualTasks: [...prev[day].individualTasks, { 
          ...task, 
            id: newTaskId,
          template_id: task.id, // Store the original template ID
            is_saved: false, // Mark as unsaved
            from_group: fromGroup ? {
              id: fromGroup.id,
              name: fromGroup.name,
              template_id: fromGroup.template_id
            } : undefined
          }]
        }
      }
      console.log('[KIDOERS-ROUTINE] Updated calendar state:', newState)
      return newState
    })
    
    // Day orders are now saved immediately when dragging, no need to track unsaved changes
    console.log('[KIDOERS-ROUTINE] Task added to calendar successfully')
  }

  const addTaskToCalendar = async (memberId: string, task: Task, applyTo: string, day: string, routineData?: any) => {
    console.log('[TASK-DEBUG] 🔍 addTaskToCalendar called with applyTo:', applyTo);
    
    // Handle 'none' case directly without looking for applyToOption
    if (applyTo === 'none') {
      // This is the case where we're adding to a specific member only
      console.log('[TASK-DEBUG] 🎯 Adding task to specific member only');
    } else {
      const applyToOption = applyToOptions.find(option => option.id === applyTo)
      if (!applyToOption) {
        console.log('[TASK-DEBUG] ❌ No applyToOption found for:', applyTo);
        return;
      }
    }

    try {
      console.log('[TASK-DEBUG] 🚀 Adding task:', task.name, 'for member:', memberId, 'on day:', day);
      console.log('[TASK-DEBUG] 🔍 Original task ID:', task.id);
      
      // Ensure routine exists first
      console.log('[TASK-DEBUG] 🔍 Ensuring routine exists...');
      const routineData = await ensureRoutineExists();
      if (!routineData) {
        console.log('[TASK-DEBUG] ❌ Failed to create routine');
        setError('Failed to create routine. Please try again.');
        return;
      }
      console.log('[TASK-DEBUG] ✅ Routine exists:', routineData.id);

      // Save task to backend immediately
      console.log('[TASK-DEBUG] 💾 Saving task to backend:', task.name);
      const savedTask = await addRoutineTask(routineData.id, {
        name: task.name,
        description: task.description,
        points: task.points,
        duration_mins: task.estimatedMinutes,
        time_of_day: task.time_of_day,
        days_of_week: [day],
        from_task_template_id: task.is_system ? task.id : undefined,
        order_index: 0
      });
      console.log('[TASK-DEBUG] ✅ Task saved to backend:', savedTask);

      // Create task assignment
      console.log('[TASK-DEBUG] 🎯 Creating task assignment...');
      await createTaskAssignment(routineData.id, savedTask.id, memberId, 0);
      console.log('[TASK-DEBUG] ✅ Task assignment created');

      // Add task to calendar with real ID
      console.log('[TASK-DEBUG] 📅 Adding to UI with memberId:', memberId);
      const taskToAdd = { 
        ...task, 
        id: savedTask.id, // Use real ID from backend
        memberId: memberId, // Set the member ID for filtering
        is_saved: true
      };
      console.log('[TASK-DEBUG] 📋 Task object to add:', taskToAdd);
      setCalendarTasks(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          individualTasks: [...prev[day].individualTasks, taskToAdd]
        }
      }))
      
      // Day orders are now saved immediately when dragging, no need to track unsaved changes
      console.log('[TASK-DEBUG] ✅ Task added successfully');
    } catch (e: any) {
      console.error('[TASK-DEBUG] ❌ Error:', e?.message);
      setError(e?.message || 'Failed to save task. Please try again.');
    }
  }



  const removeGroupFromCalendar = (day: string, groupId: string) => {
    setCalendarTasks(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        groups: prev[day].groups.filter((group: TaskGroup) => group.id !== groupId)
      }
    }))
  }




  const handleSaveRoutineDetails = async (scheduleData: RoutineScheduleData) => {
    try {
      // Ensure routine exists before saving schedule
      const routineData = await ensureRoutineExists()
      if (!routineData) {
        setError('Failed to create routine. Please try again.')
        return
      }
      
      // Save schedule data
      setRoutineScheduleData(scheduleData)
      setShowRoutineDetails(false)
      
      // Create the schedule
      await createRoutineSchedule(routineData.id, scheduleData)
      console.log('[KIDOERS-ROUTINE] Routine schedule saved successfully:', scheduleData)
    } catch (err) {
      console.error('[KIDOERS-ROUTINE] ','Error saving routine details:', err)
      setError('Failed to save routine details. Please try again.')
    }
  }

  const handleSaveRoutine = async () => {
    console.log('[KIDOERS-ROUTINE] ManualRoutineBuilder: handleSaveRoutine called, isEditMode:', isEditMode, 'onComplete:', !!onComplete);
    setBusy(true)
    try {
      // Ensure routine exists (create if needed)
      const routineData = await ensureRoutineExists();
      if (!routineData) {
        setError('Failed to create routine. Please try again.');
        return;
      }
      
      // Update routine name if changed
      if (routineData.name !== routineName.trim()) {
        console.log('[KIDOERS-ROUTINE] 📝 Updating routine name:', routineName.trim());
        await patchRoutine(routineData.id, { name: routineName.trim() });
        console.log('[KIDOERS-ROUTINE] ✅ Routine name updated');
      }
      
      // Day orders are now saved immediately when dragging, so no need to save them here
      console.log('[KIDOERS-ROUTINE] ✅ Routine name updated, proceeding to finalize routine');
      
      // Publish the routine
      await patchRoutine(routineData.id, { status: "active" })
      
      // Create a basic routine schedule (required for task instance generation)
      try {
        const today = new Date()
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        
        const scheduleData: RoutineScheduleData = {
          scope: 'everyday',
          days_of_week: [],
          start_date: today,
          end_date: nextWeek,
          timezone: 'UTC',
          is_active: true
        }
        
        await createRoutineSchedule(routineData.id, scheduleData)
        console.log('[KIDOERS-ROUTINE] Routine schedule created successfully')
      } catch (scheduleError) {
        console.error('[KIDOERS-ROUTINE] ','Failed to create routine schedule:', scheduleError)
        // Don't fail the whole process if schedule creation fails
      }

      // Generate task instances (using task-level schedules)
      if (familyId) {
        try {
          const today = new Date()
          const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
          
          // Generate task instances based on individual task schedules
          await generateTaskInstances(familyId, {
            start_date: today,
            end_date: nextWeek
          })
        } catch (error) {
          console.error('[KIDOERS-ROUTINE] ','Failed to generate task instances:', error)
          // Don't fail the whole process if instance generation fails
        }
      }
      
      // If we have an onComplete callback and we're not in edit mode (onboarding flow), mark onboarding as completed
      if (onComplete && !isEditMode) {
        console.log('[KIDOERS-ROUTINE] ManualRoutineBuilder: Calling onComplete (onboarding flow)');
        // Mark onboarding as completed via API
        try {
          await apiService.completeOnboarding(familyId!)
        } catch (error) {
          console.error('[KIDOERS-ROUTINE] ','Failed to mark onboarding as completed:', error)
        }
        onComplete()
      } else if (!isEditMode) {
        console.log('[KIDOERS-ROUTINE] ManualRoutineBuilder: Navigating to dashboard (standalone mode)');
        // Otherwise, navigate to dashboard (standalone mode)
        router.push('/dashboard')
      } else {
        console.log('[KIDOERS-ROUTINE] ManualRoutineBuilder: In edit mode, staying in routine builder');
      }
      // If isEditMode is true, stay in the routine builder (don't call onComplete or navigate)
    } catch (error) {
      console.error('[KIDOERS-ROUTINE] ','Failed to save routine:', error)
      setError('Failed to save routine. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  // Helper function to extract member ID from task/group ID
  const extractMemberIdFromId = (id: string): string => {
    // ID format: templateId-memberId-day-timestamp
    // Since UUIDs contain dashes, we need to find the member ID by looking for the pattern
    // The member ID is the second UUID in the string (after the template UUID)
    const parts = id.split('-')
    
    // If we have at least 9 parts (template UUID has 5 parts, member UUID has 5 parts)
    if (parts.length >= 9) {
      // Template UUID: parts[0-4], Member UUID: parts[5-9]
      return `${parts[5]}-${parts[6]}-${parts[7]}-${parts[8]}-${parts[9]}`
    }
    
    // Fallback: try to find member ID by looking for the selected member ID in the string
    if (selectedMemberId && id.includes(selectedMemberId)) {
      return selectedMemberId
    }
    
    // Last resort: return empty string
    return ''
  }

  const extractRoutineTaskIdFromId = (id: string): string => {
    // ID format: templateId-memberId-day-timestamp
    // We need the templateId (routine_task_id) which is the first UUID
    const parts = id.split('-')
    
    // If we have at least 5 parts (template UUID has 5 parts)
    if (parts.length >= 5) {
      // Template UUID: parts[0-4]
      return `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}-${parts[4]}`
    }
    
    return id // Fallback to original ID
  }

  const getTotalTasksForDay = (day: string) => {
    const dayTasks = calendarTasks[day]
    
    if (!dayTasks) {
      return 0
    }
    
    // Filter groups by selected member
    const filteredGroups = dayTasks.groups.filter((group: TaskGroup) => {
      const groupMemberId = extractMemberIdFromId(group.id)
      const matches = groupMemberId === selectedMemberId
      return matches
    })
    
    // Filter individual tasks by selected member
    const filteredIndividualTasks = dayTasks.individualTasks.filter((task: Task) => {
      const taskMemberId = task.memberId || extractMemberIdFromId(task.id)
      const matches = taskMemberId === selectedMemberId
      console.log('[FILTER-DEBUG] Filtering task:', {
        taskName: task.name,
        taskId: task.id,
        taskMemberId: taskMemberId,
        selectedMemberId: selectedMemberId,
        matches: matches,
        hasMemberId: !!task.memberId,
        memberIdValue: task.memberId
      });
      return matches
    })
    
    const total = filteredGroups.reduce((sum: number, group: TaskGroup) => sum + group.tasks.length, 0) + filteredIndividualTasks.length
    return total
  }

  // Get all unique task groups that have been assigned to the selected member
  const getAssignedTaskGroups = () => {
    const groups = new Map<string, TaskGroup>()
    
    Object.values(calendarTasks).forEach(dayTasks => {
      dayTasks.groups
        .filter((group: TaskGroup) => {
          const groupMemberId = extractMemberIdFromId(group.id)
          return groupMemberId === selectedMemberId
        })
        .forEach(group => {
          if (!groups.has(group.template_id || group.id)) {
            groups.set(group.template_id || group.id, group)
          }
        })
    })
    
    return Array.from(groups.values())
  }

  // Get tasks for a specific group across all days for the selected member
  const getTasksForGroup = (group: TaskGroup) => {
    const tasks: Array<{ task: Task, member: any, day: string }> = []
    
    Object.entries(calendarTasks).forEach(([day, dayTasks]) => {
      dayTasks.groups
        .filter((assignedGroup: TaskGroup) => {
          // Only include groups assigned to the selected member
          const groupMemberId = extractMemberIdFromId(assignedGroup.id)
          return groupMemberId === selectedMemberId
        })
        .forEach(assignedGroup => {
          if (assignedGroup.template_id === group.template_id || assignedGroup.id === group.id) {
            assignedGroup.tasks.forEach(task => {
              const member = enhancedFamilyMembers.find(m => m.id === selectedMemberId)
              if (member) {
                tasks.push({ task, member, day })
              }
            })
          }
        })
    })
    
    return tasks
  }

  const totalTasks = Object.keys(calendarTasks).reduce((sum, day) => sum + getTotalTasksForDay(day), 0)

  // Derive schedule from calendar task placement
  const deriveScheduleFromCalendar = () => {
    const daysWithTasks = Object.keys(calendarTasks).filter(day => getTotalTasksForDay(day) > 0)
    
    if (daysWithTasks.length === 0) {
      return { scope: 'everyday' as const, days_of_week: [] }
    }
    
    if (daysWithTasks.length === 7) {
      return { scope: 'everyday' as const, days_of_week: [] }
    }
    
    if (daysWithTasks.length === 5 && 
        daysWithTasks.includes('monday') && 
        daysWithTasks.includes('tuesday') && 
        daysWithTasks.includes('wednesday') && 
        daysWithTasks.includes('thursday') && 
        daysWithTasks.includes('friday') &&
        !daysWithTasks.includes('saturday') &&
        !daysWithTasks.includes('sunday')) {
      return { scope: 'weekdays' as const, days_of_week: [] }
    }
    
    if (daysWithTasks.length === 2 && 
        daysWithTasks.includes('saturday') && 
        daysWithTasks.includes('sunday') &&
        !daysWithTasks.includes('monday') &&
        !daysWithTasks.includes('tuesday') &&
        !daysWithTasks.includes('wednesday') &&
        !daysWithTasks.includes('thursday') &&
        !daysWithTasks.includes('friday')) {
      return { scope: 'weekends' as const, days_of_week: [] }
    }
    
    // Custom schedule with specific days
    return { 
      scope: 'custom' as const, 
      days_of_week: daysWithTasks 
    }
  }

  const panelWidth = isPanelCollapsed ? 'w-12' : 'w-80'

  // Lazy routine creation - only create when user actually starts building
  const ensureRoutineExists = async () => {
    if (routine) return routine;
    
    if (!familyId) return null;
    
    try {
      console.log('[KIDOERS-ROUTINE] Creating routine draft lazily...');
      const created = await createRoutineDraft(familyId, routineName);
      console.log('[KIDOERS-ROUTINE] Routine draft created:', created);
      const routineData = {
        id: created.id,
        family_id: created.family_id,
        name: created.name,
        status: created.status as "draft"|"active"|"archived"
      };
      setRoutine(routineData);
      setCurrentRoutineId(routineData.id);
      console.log('[KIDOERS-ROUTINE] Set currentRoutineId to:', routineData.id);
      return routineData;
    } catch (e: any) {
      console.error('[KIDOERS-ROUTINE] ','Error creating routine:', e);
      setError(e?.message || "Failed to create routine");
      return null;
    }
  };

  // Load existing routine data using the new full-data endpoint
  const loadExistingRoutineData = async (routineId: string, enhancedMembers: any[]) => {
    setCurrentRoutineId(routineId)
    try {
      
      // Load complete routine data
      console.log('[KIDOERS-ROUTINE] 📞 ManualRoutineBuilder: Calling getRoutineFullData()');
      const fullData = await getRoutineFullData(routineId);
      console.log('[KIDOERS-ROUTINE] ✅ ManualRoutineBuilder: Full routine data loaded:', fullData);
      
      // Transform backend data to frontend format
      const transformedGroups: TaskGroup[] = fullData.groups.map(group => ({
        id: group.id,
        name: group.name,
        description: '',
        tasks: group.tasks.map(task => ({
          id: task.id,
          name: task.name,
          description: task.description || '',
          points: task.points,
          estimatedMinutes: task.duration_mins || 5,
          time_of_day: task.time_of_day as "morning" | "afternoon" | "evening" | "night" | undefined,
          is_saved: true,
          template_id: undefined,
          days_of_week: task.days_of_week
        })),
        color: 'bg-blue-100 border-blue-300',
        time_of_day: group.time_of_day as "morning" | "afternoon" | "evening" | "night" | undefined,
        is_saved: true,
        template_id: undefined
      }));
      
      // Transform individual tasks
      const individualTasks: Task[] = fullData.individual_tasks.map(task => ({
        id: task.id,
        name: task.name,
        description: task.description || '',
        points: task.points,
        estimatedMinutes: task.duration_mins || 5,
        time_of_day: task.time_of_day as "morning" | "afternoon" | "evening" | "night" | undefined,
        is_saved: true,
        template_id: undefined,
        days_of_week: task.days_of_week
      }));
      
      console.log('[KIDOERS-ROUTINE] Transformed groups:', transformedGroups);
      console.log('[KIDOERS-ROUTINE] Transformed individual tasks:', individualTasks);
      
      // Load day-specific orders
      console.log('[DRAG-ORDER] 📋 ManualRoutineBuilder: Loading day-specific orders');
      setDayOrders(fullData.day_orders || []);
      console.log('[DRAG-ORDER] ✅ ManualRoutineBuilder: Day orders loaded:', fullData.day_orders);
      
      // Create a map of task assignments by member
      const assignmentsByMember = new Map<string, string[]>(); // memberId -> taskIds
      
      // Process group tasks assignments
      for (const group of fullData.groups) {
        for (const task of group.tasks) {
          for (const assignment of task.assignments) {
        const memberId = assignment.member_id;
        const taskId = assignment.routine_task_id;
        if (!assignmentsByMember.has(memberId)) {
          assignmentsByMember.set(memberId, []);
        }
        assignmentsByMember.get(memberId)!.push(taskId);
          }
        }
      }
      
      // Process individual tasks assignments
      for (const task of fullData.individual_tasks) {
        for (const assignment of task.assignments) {
          const memberId = assignment.member_id;
          const taskId = assignment.routine_task_id;
          if (!assignmentsByMember.has(memberId)) {
            assignmentsByMember.set(memberId, []);
          }
          assignmentsByMember.get(memberId)!.push(taskId);
        }
      }
      
      console.log('[KIDOERS-ROUTINE] Assignments by member:', assignmentsByMember);
      
      // Distribute tasks and groups to the correct family members
      setEnhancedFamilyMembers(members =>
        members.map(member => {
          const memberTaskIds = assignmentsByMember.get(member.id) || [];
          
          // Filter groups that have tasks assigned to this member
          const memberGroups = transformedGroups.filter(group => 
            group.tasks.some(task => memberTaskIds.includes(task.id))
          ).map(group => ({
            ...group,
            tasks: group.tasks.filter(task => memberTaskIds.includes(task.id))
          }));
          
          // Filter individual tasks assigned to this member
          const memberIndividualTasks = individualTasks.filter(task => 
            memberTaskIds.includes(task.id)
          );
          
          console.log('[KIDOERS-ROUTINE] ',`Member ${member.name} (${member.id}):`, {
            memberTaskIds,
            memberGroups: memberGroups.length,
            memberIndividualTasks: memberIndividualTasks.length
          });
          
          return {
            ...member,
            groups: memberGroups,
            individualTasks: memberIndividualTasks
          };
        })
      );
      
      console.log('[KIDOERS-ROUTINE] Loaded routine data with proper task assignments');
      
      // Populate the calendar with tasks based on their days_of_week
      // Clear existing tasks to avoid duplication
      const newCalendarTasks: Record<string, { groups: TaskGroup[], individualTasks: Task[] }> = {
        sunday: { individualTasks: [], groups: [] },
        monday: { individualTasks: [], groups: [] },
        tuesday: { individualTasks: [], groups: [] },
        wednesday: { individualTasks: [], groups: [] },
        thursday: { individualTasks: [], groups: [] },
        friday: { individualTasks: [], groups: [] },
        saturday: { individualTasks: [], groups: [] }
      };
      
      // Process individual tasks
      for (const task of individualTasks) {
        const memberTaskIds = assignmentsByMember.get(selectedMemberId || enhancedMembers[0]?.id) || [];
        if (memberTaskIds.includes(task.id) && task.days_of_week) {
          // Add this task to each day it's scheduled for
          for (const day of task.days_of_week) {
            if (newCalendarTasks[day]) {
              newCalendarTasks[day].individualTasks.push({
                ...task,
                id: task.id, // Use real UUID from backend
                memberId: selectedMemberId || enhancedMembers[0]?.id, // Set member ID for filtering
                is_saved: true // Mark as saved
              });
            }
          }
        }
      }
      
      // Process group tasks
      for (const group of transformedGroups) {
        const memberTaskIds = assignmentsByMember.get(selectedMemberId || enhancedMembers[0]?.id) || [];
        const memberGroupTasks = group.tasks.filter(task => memberTaskIds.includes(task.id));
        
        if (memberGroupTasks.length > 0) {
          // Add groups to days based on their tasks' days_of_week
          const allDays = new Set<string>();
          memberGroupTasks.forEach(task => {
            if (task.days_of_week) {
              task.days_of_week.forEach(day => allDays.add(day));
            }
          });
          
          for (const day of allDays) {
            if (newCalendarTasks[day]) {
              const tasksForDay = memberGroupTasks.filter(task => 
                task.days_of_week && task.days_of_week.includes(day)
              );
              
              newCalendarTasks[day].groups.push({
                ...group,
                tasks: tasksForDay
              });
            }
          }
        }
      }
      
      setCalendarTasks(newCalendarTasks);
      console.log('[KIDOERS-ROUTINE] Populated calendar with existing tasks:', newCalendarTasks);
      
      // Load routine schedule data
      if (fullData.schedules && fullData.schedules.length > 0) {
        console.log('[KIDOERS-ROUTINE] 📅 ManualRoutineBuilder: Loading routine schedule data...');
        
        // Find the active schedule
        const activeSchedule = fullData.schedules.find(s => s.is_active);
        if (activeSchedule) {
          console.log('[KIDOERS-ROUTINE] Active schedule found:', activeSchedule);
          // Convert the schedule data to the format expected by RoutineDetailsModal
          const scheduleData: RoutineScheduleData = {
            scope: activeSchedule.scope as 'everyday' | 'weekdays' | 'weekends' | 'custom',
            days_of_week: activeSchedule.days_of_week || [],
            start_date: activeSchedule.start_date ? new Date(activeSchedule.start_date) : undefined,
            end_date: activeSchedule.end_date ? new Date(activeSchedule.end_date) : undefined,
            timezone: activeSchedule.timezone || 'UTC',
            is_active: true
          };
          setRoutineScheduleData(scheduleData);
          console.log('[KIDOERS-ROUTINE] Set routine schedule data:', scheduleData);
        } else {
          console.log('[KIDOERS-ROUTINE] No active schedule found');
        }
      }
      
    } catch (e: any) {
      console.error('[KIDOERS-ROUTINE] ','Error loading routine data:', e);
    }
  };


  // Filter tasks and groups based on show options
  const filteredGroups = showOnlyTasks ? [] : libraryGroups
  const filteredTasks = showOnlyGroups ? [] : libraryTasks

  return (
    <div className={`${onComplete ? 'min-h-0' : 'min-h-screen'} bg-gray-50 flex flex-col`}>
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="space-y-2">

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">
                {error}
              </div>
            )}

            {/* Back Button for Edit Mode */}
            {isEditMode && onBack && (
              <div className="mb-4">
                <Button
                  onClick={onBack}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Chores
                </Button>
              </div>
            )}

            {/* Routine Details */}
            <Card className="bg-white border border-gray-200">
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-end justify-between gap-4">
                    <div className="flex items-end gap-4">
                      <div className="flex-1 max-w-md">
                        <Label htmlFor="routineName">Routine Name</Label>
                        <div className="relative">
                          <Input
                            id="routineName"
                            placeholder="My Family Routine"
                            value={routineName}
                            onChange={(e) => {
                              const newName = e.target.value;
                              setRoutineName(newName);
                              
                              // Mark as having unsaved changes if name is different from current routine
                              if (routine && routine.name !== newName.trim()) {
                                setHasUnsavedChanges(true);
                              } else if (routine && routine.name === newName.trim()) {
                                setHasUnsavedChanges(false);
                              }
                            }}
                            className="bg-white"
                            disabled={busy}
                          />
                        </div>
                        {!routineName.trim() && (
                          <p className="text-sm text-amber-600 mt-1">
                            Routine name is required to save your routine
                          </p>
                        )}
                      </div>
                      
                      {/* Family Member Selector */}
                      <div className="flex-1 min-w-fit">
                        <div className="flex items-center justify-center gap-10 py-0 px-16 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-3xl shadow-sm border border-white/50 min-w-fit">
                          {enhancedFamilyMembers.length === 0 && (
                            <div className="text-sm text-gray-500">Loading family members...</div>
                          )}
                          {enhancedFamilyMembers.map((member) => {
                            const colors = getMemberColors(member.color)
                            const avatarUrl = member.avatar_url || generateAvatarUrl(
                              member.avatar_seed || member.name.toLowerCase().replace(/\s+/g, '-'),
                              member.avatar_style || 'adventurer',
                              member.avatar_options || {}
                            )
                            
                            const memberColor = (member.color as string) || 'blue'
                            const colorClasses = {
                              blue: {
                                ring: 'ring-blue-500',
                                bg: 'bg-blue-500',
                                shadow: 'shadow-blue-200',
                                hover: 'hover:ring-blue-300',
                              },
                              green: {
                                ring: 'ring-green-500',
                                bg: 'bg-green-500',
                                shadow: 'shadow-green-200',
                                hover: 'hover:ring-green-300',
                              },
                              yellow: {
                                ring: 'ring-yellow-500',
                                bg: 'bg-yellow-500',
                                shadow: 'shadow-yellow-200',
                                hover: 'hover:ring-yellow-300',
                              },
                              orange: {
                                ring: 'ring-orange-500',
                                bg: 'bg-orange-500',
                                shadow: 'shadow-orange-200',
                                hover: 'hover:ring-orange-300',
                              },
                              purple: {
                                ring: 'ring-purple-500',
                                bg: 'bg-purple-500',
                                shadow: 'shadow-purple-200',
                                hover: 'hover:ring-purple-300',
                              },
                              pink: {
                                ring: 'ring-pink-500',
                                bg: 'bg-pink-500',
                                shadow: 'shadow-pink-200',
                                hover: 'hover:ring-pink-300',
                              },
                              teal: {
                                ring: 'ring-teal-500',
                                bg: 'bg-teal-500',
                                shadow: 'shadow-teal-200',
                                hover: 'hover:ring-teal-300',
                              },
                              indigo: {
                                ring: 'ring-indigo-500',
                                bg: 'bg-indigo-500',
                                shadow: 'shadow-indigo-200',
                                hover: 'hover:ring-indigo-300',
                              },
                            }[memberColor] || {
                              ring: 'ring-blue-500',
                              bg: 'bg-blue-500',
                              shadow: 'shadow-blue-200',
                              hover: 'hover:ring-blue-300',
                            }
                            
                            return (
                              <div
                                key={member.id}
                                className="flex items-center gap-3 cursor-pointer group transition-all duration-300"
                                onClick={() => setSelectedMemberId(member.id)}
                              >
                                <div className="relative">
                                  <div
                                    className={`h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow-lg transition-all duration-300 group-hover:scale-105 ${
                                      selectedMemberId === member.id
                                        ? `ring-2 ring-offset-2 ${colorClasses.ring} ${colorClasses.shadow} scale-110`
                                        : `group-hover:ring-1 group-hover:ring-offset-1 ${colorClasses.hover} group-hover:shadow-md`
                                    }`}
                                  >
                                    <img
                                      src={avatarUrl || "/placeholder.svg"}
                                      alt={`${member.name}'s avatar`}
                                      className="h-full w-full object-cover scale-110"
                                    />
                                  </div>

                                  {selectedMemberId === member.id && (
                                    <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-lg ring-1 ring-white">
                                      <div className={`${colorClasses.bg} rounded-full p-1`}>
                                        <Check className="h-3 w-3 text-white stroke-[2]" />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-col">
                                  <p
                                    className={`text-sm font-semibold transition-all duration-300 ${
                                      selectedMemberId === member.id
                                        ? "text-gray-900 scale-105"
                                        : "text-gray-600 group-hover:text-gray-800"
                                    }`}
                                  >
                                    {member.name}
                                  </p>
                                  {selectedMemberId === member.id && (
                                    <div
                                      className={`h-1 w-10 ${colorClasses.bg} rounded-full mt-1 shadow-sm`}
                                    />
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* View Mode Toggle - Moved to the right */}
                    {selectedMemberId && (
                      <div className="flex-shrink-0">
                        <Label className="text-sm font-medium text-gray-700">View Mode</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Button
                            variant={viewMode === 'calendar' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode('calendar')}
                            className="flex items-center space-x-2"
                          >
                            <span>Calendar View</span>
                          </Button>
                          <Button
                            variant={viewMode === 'group' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode('group')}
                            className="flex items-center space-x-2"
                          >
                            <span>Group View</span>
                          </Button>
                        </div>
                      </div>
                    )}
                    
                  </div>

                  {!selectedMemberId && (
                    <p className="text-sm text-amber-600">
                      Please select a family member to start building their routine
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Task Group Selector for Group View */}
            {selectedMemberId && viewMode === 'group' && (
              <Card className="bg-white border border-gray-200 mb-4">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm font-medium text-gray-700">Select task group:</Label>
                        <Select
                          value={selectedTaskGroup?.id || ''}
                          onValueChange={(value) => {
                            const group = getAssignedTaskGroups().find(g => g.id === value)
                            setSelectedTaskGroup(group || null)
                          }}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Choose a task group" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAssignedTaskGroups().map((group) => (
                              <SelectItem key={group.id} value={group.id}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {selectedTaskGroup && (
                      <div className="text-sm text-gray-600">
                        {getTasksForGroup(selectedTaskGroup).length} tasks assigned
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Calendar Grid */}
            {selectedMemberId && viewMode === 'calendar' && (
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-0">
                  <div className="grid grid-cols-7 gap-0 min-h-[900px]">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                      const dayTasks = calendarTasks[day]
                      const totalDayTasks = getTotalTasksForDay(day)
                      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                      const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(day)
                      
                      
                      return (
                        <div
                          key={day}
                          className="border-r border-gray-200 last:border-r-0 min-h-[900px] flex flex-col cursor-pointer hover:bg-gray-50 transition-colors"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDropOnDay(e, day)}
                          onClick={() => handleColumnClick(day)}
                        >
                          {/* Day Header */}
                          <div className="text-center p-3 bg-gray-50">
                            <div className="text-sm font-semibold text-gray-700">{dayNames[dayIndex]}</div>
                            <div className="text-xs text-gray-500 capitalize">{day}</div>
                          </div>

                          {/* Separator Line */}
                          <div className="border-b border-gray-200"></div>

                          {/* Tasks Area */}
                          <div className="flex-1 p-3 bg-white space-y-2">
                            {totalDayTasks > 0 && (
                              <>
                                {/* Groups - Filtered by Selected Member */}
                                {dayTasks.groups
                                  .filter((group: TaskGroup) => {
                                    // Extract member ID from group ID (format: templateId-memberId-day-timestamp)
                                    const groupMemberId = extractMemberIdFromId(group.id)
                                    return groupMemberId === selectedMemberId
                                  })
                                  .map((group: TaskGroup) => (
                                  <div key={group.id} className="space-y-1" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-1">
                                        <Folder className="w-3 h-3 text-purple-600" />
                                        <span className="font-medium text-xs text-gray-900">{group.name}</span>
                                        <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800">
                                          group
                                        </Badge>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeGroupFromCalendar(day, group.id)}
                                        className="text-red-500 hover:text-red-700 h-4 w-4 p-0"
                                      >
                                        <Trash2 className="w-2 h-2" />
                                      </Button>
                                    </div>
                                    
                                    {group.tasks.map((task: Task) => (
                                      <div 
                                        key={task.id} 
                                        className={`ml-3 flex items-center space-x-1 p-1 bg-purple-50 rounded border-l-4 border-purple-500 border border-gray-200 cursor-pointer ${
                                          draggedTask?.task.id === task.id ? 'opacity-50 task-dragging' : ''
                                        }`}
                                        draggable={true}
                                        onDragStart={(e) => handleTaskDragStart(e, task, day, selectedMemberId)}
                                        onDragEnd={() => {
                                          setDraggedTask(null)
                                          setDragOverPosition(null)
                                          setIsDragging(false)
                                        }}
                                      >
                                        {/* Always show drag handle in routine builder */}
                                        <div className="w-3 h-3 flex items-center justify-center text-gray-400">
                                          <Move className="w-2 h-2" />
                                        </div>
                                        
                                        <div className="flex-1">
                                          <div className="text-xs font-medium text-gray-900">{task.name}</div>
                                          <div className="text-xs text-purple-600">from {group.name}</div>
                                        </div>
                                        <div className="text-xs text-gray-500">{task.points}pts</div>
                                      </div>
                                    ))}
                                  </div>
                                ))}

                                {/* Individual Tasks - Filtered by Selected Member */}
                                {getTasksWithDayOrder(
                                  dayTasks.individualTasks.filter((task: Task) => {
                                    const taskMemberId = task.memberId || extractMemberIdFromId(task.id)
                                    const matches = taskMemberId === selectedMemberId
                                    console.log('[KIDOERS-ROUTINE] Filtering task:', { 
                                      taskId: task.id, 
                                      taskName: task.name, 
                                      taskMemberId, 
                                      selectedMemberId, 
                                      matches 
                                    })
                                    return matches
                                  }), 
                                  day, 
                                  selectedMemberId
                                )
                                  .map((task: Task, taskIndex: number, taskArray: Task[]) => (
                                  <div key={task.id}>
                                    {/* Drop zone before this task */}
                                    {(
                                      <div
                                        className={`h-1 transition-colors ${
                                          dragOverPosition?.day === day && 
                                          dragOverPosition?.memberId === selectedMemberId && 
                                          dragOverPosition?.position === 'before' && 
                                          dragOverPosition?.targetTaskId === task.id
                                            ? 'bg-blue-500' 
                                            : 'hover:bg-blue-200'
                                        }`}
                                        onDragOver={(e) => handleTaskDragOver(e, day, selectedMemberId, 'before', task.id)}
                                        onDragLeave={handleTaskDragLeave}
                                        onDrop={(e) => handleTaskDrop(e, day, selectedMemberId)}
                                      />
                                    )}
                                    
                                    <div 
                                      className={`flex items-center space-x-1 p-1 rounded border border-gray-200 ${
                                        task.from_group 
                                          ? 'bg-purple-50 border-l-4 border-purple-500' 
                                          : 'bg-green-50 border-l-4 border-green-500'
                                      } cursor-pointer hover:shadow-sm transition-shadow ${
                                        draggedTask?.task.id === task.id ? 'opacity-50 task-dragging' : ''
                                      }`}
                                      draggable={true}
                                      onDragStart={(e) => handleTaskDragStart(e, task, day, selectedMemberId)}
                                      onDragEnd={() => {
                                        setDraggedTask(null)
                                        setDragOverPosition(null)
                                        setIsDragging(false)
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleTaskClick(e, task, day, selectedMemberId)
                                      }}
                                    >
                                    {/* Always show drag handle in routine builder */}
                                    <div className="w-3 h-3 flex items-center justify-center text-gray-400">
                                      <Move className="w-2 h-2" />
                                    </div>
                                    
                                    
                                    <div className="flex-1">
                                      <div className="text-xs font-medium text-gray-900">{task.name}</div>
                                      <div className={`text-xs flex items-center space-x-1 ${
                                        task.from_group ? 'text-purple-600' : 'text-green-600'
                                      }`}>
                                        {task.from_group ? (
                                          <>
                                            <Folder className="w-3 h-3" />
                                            <span>from {task.from_group.name}</span>
                                          </>
                                        ) : (
                                          <span>individual task</span>
                                        )}
                                    </div>
                                    </div>
                                    <div className="text-xs text-gray-500">{task.points}pts</div>
                                  </div>
                                  
                                  {/* Drop zone after this task */}
                                  {taskIndex === taskArray.length - 1 && (
                                    <div
                                      className={`h-1 transition-colors ${
                                        dragOverPosition?.day === day && 
                                        dragOverPosition?.memberId === selectedMemberId && 
                                        dragOverPosition?.position === 'after' && 
                                        dragOverPosition?.targetTaskId === task.id
                                          ? 'bg-blue-500' 
                                          : 'hover:bg-blue-200'
                                      }`}
                                      onDragOver={(e) => handleTaskDragOver(e, day, selectedMemberId, 'after', task.id)}
                                      onDragLeave={handleTaskDragLeave}
                                      onDrop={(e) => handleTaskDrop(e, day, selectedMemberId)}
                                    />
                                  )}
                                </div>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Group View */}
            {selectedMemberId && viewMode === 'group' && (
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-0">
                  {!selectedTaskGroup ? (
                    <div className="text-center py-12">
                      <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Task Group Selected</h3>
                      <p className="text-gray-500">Select a task group from the dropdown to view its schedule</p>
                    </div>
                  ) : (
                    <div className="p-6">
                      <div className="mb-6">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <h2 className="text-xl font-bold text-gray-900">{selectedTaskGroup.name}</h2>
                        </div>
                        <p className="text-gray-600">{selectedTaskGroup.description}</p>
                      </div>
                      
                      {/* Group by Day Visualization */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Group by Day</h3>
                        <div className="grid grid-cols-7 gap-4">
                          {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => {
                            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                            const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day)
                            const dayTasks = getTasksForGroup(selectedTaskGroup).filter(t => t.day === day)
                            
                            return (
                              <div key={day} className="space-y-2">
                                <div className="text-center">
                                  <div className="text-sm font-semibold text-gray-700">{dayNames[dayIndex]}</div>
                                  <div className="text-xs text-gray-500 capitalize">{day}</div>
                                </div>
                                
                                <div className="space-y-2 min-h-32">
                                  {dayTasks.length === 0 ? (
                                    <div className="text-center py-4 text-gray-400 text-sm">
                                      No tasks
                                    </div>
                                  ) : (
                                    dayTasks.map(({ task, member }, index) => {
                                      const colors = getMemberColors(member.color)
                                      return (
                                        <div
                                          key={`${task.id}-${index}`}
                                          className={`p-2 rounded-lg border-l-4 border-purple-500 ${colors.bg} ${colors.border} border`}
                                        >
                                          <div className="flex items-center space-x-2">
                                            <div className={`w-2 h-2 rounded-full ${colors.border.replace('border-', 'bg-')}`}></div>
                                            <span className="text-sm font-medium text-gray-900">{task.name}</span>
                                          </div>
                                          <div className="text-xs text-gray-600 mt-1">
                                            {member.name} • {task.points}pts
                                          </div>
                                        </div>
                                      )
                                    })
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      
                      {/* Group by Member Visualization */}
                      <div className="mt-8 space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Group by Member</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {enhancedFamilyMembers.map((member) => {
                            const memberTasks = getTasksForGroup(selectedTaskGroup).filter(t => t.member.id === member.id)
                            const colors = getMemberColors(member.color)
                            
                            return (
                              <div key={member.id} className="space-y-2">
                                <div className="flex items-center space-x-2 mb-3">
                                  <div className={`w-3 h-3 rounded-full ${colors.border.replace('border-', 'bg-')}`}></div>
                                  <h4 className="font-semibold text-gray-900">{member.name}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {memberTasks.length} tasks
                                  </Badge>
                                </div>
                                
                                <div className="space-y-2">
                                  {memberTasks.length === 0 ? (
                                    <div className="text-center py-4 text-gray-400 text-sm">
                                      No tasks assigned
                                    </div>
                                  ) : (
                                    memberTasks.map(({ task, day }, index) => (
                                      <div
                                        key={`${task.id}-${index}`}
                                        className={`p-2 rounded-lg border-l-4 border-purple-500 ${colors.bg} ${colors.border} border`}
                                      >
                                        <div className="text-sm font-medium text-gray-900">{task.name}</div>
                                        <div className="text-xs text-gray-600 mt-1">
                                          {day.charAt(0).toUpperCase() + day.slice(1)} • {task.points}pts
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Save Button */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">


              <Button
                onClick={handleSaveRoutine}
                disabled={totalTasks === 0 || busy || !routineName.trim()}
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

            {(totalTasks === 0 || !routineName.trim()) && (
              <p className="text-center text-sm text-amber-600">
                {!routineName.trim() 
                  ? "Please enter a routine name to continue"
                  : "Drag tasks and groups from the library panel to family members"
                }
              </p>
            )}
          </div>
        </div>

        {/* Right Panel - Task Library */}
        <div className={`${panelWidth} bg-white border-l border-gray-200 overflow-y-auto transition-all duration-300 flex flex-col`}>
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

          {/* Collapsed State Label */}
          {isPanelCollapsed && (
            <div className="flex items-center justify-center h-full">
              <div className="transform -rotate-90 text-gray-600 font-medium text-base tracking-wide whitespace-nowrap">
                Task Library
              </div>
            </div>
          )}

          {!isPanelCollapsed && (
            <div className="p-2 space-y-3">
              <div className="text-center">
                <h2 className="text-lg font-bold text-gray-900">Task Library</h2>
                <p className="text-xs text-gray-600">Drag tasks and groups to your routine</p>
              </div>

              {/* Filter Options */}
              <div className="flex gap-1">
                <Button
                  variant={!showOnlyTasks && !showOnlyGroups ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setShowOnlyTasks(false)
                    setShowOnlyGroups(false)
                  }}
                  className="flex-1 text-xs py-1"
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
                  className="flex-1 text-xs py-1"
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
                  className="flex-1 text-xs py-1"
                >
                  Tasks Only
                </Button>
              </div>

              {/* Create Options */}
              <div className="mt-3 space-y-1">
                <button className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                  <Plus className="h-3 w-3" />
                  Create new task
                </button>
                <button className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                  <Plus className="h-3 w-3" />
                  Create new group
                </button>
              </div>

              {/* Task Groups */}
              {libraryLoading ? (
                <div className="space-y-3">
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
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                    <Folder className="w-5 h-5" />
                    <span>Task Groups</span>
                  </h3>
                  <div className="space-y-2">
                    {filteredGroups.map((group: TaskGroup) => (
                      <div
                        key={group.id}
                        className={`p-2 rounded-lg border-2 ${group.color}`}
                      >
                        {/* Group Header */}
                        <div className="flex items-start space-x-2 mb-2">
                          <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'group', group)}
                            className="cursor-move"
                      >
                          <GripVertical className="w-4 h-4 text-gray-400 mt-0.5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
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
                            <p className="text-xs text-gray-600">{group.description}</p>
                          </div>
                        </div>
                        
                        {/* Individual Tasks - Directly Draggable */}
                        <div className="space-y-1 ml-6">
                          {group.tasks.map((task: Task) => (
                            <div 
                              key={task.id} 
                              className="flex items-center space-x-2 text-xs p-1 rounded hover:bg-blue-50 transition-colors cursor-move"
                              draggable
                              onDragStart={(e) => handleDragStart(e, 'task', task, group)}
                            >
                              <GripVertical className="w-3 h-3 text-gray-400" />
                              <span className="flex-1 text-gray-700">{task.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {task.points}pts
                                  </Badge>
                                </div>
                              ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Individual Tasks */}
              {libraryLoading ? (
                <div className="space-y-3">
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
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                    <ListTodo className="w-5 h-5" />
                    <span>Individual Tasks</span>
                  </h3>
                  <div className="space-y-1">
                    {filteredTasks.map((task: Task) => (
                      <div
                        key={task.id}
                        className="flex items-center space-x-2 p-1.5 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors cursor-move"
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'task', task)}
                      >
                        <GripVertical className="w-3 h-3 text-gray-400" />
                          <div className="flex-1">
                          <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-sm">{task.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {task.points}pts
                              </Badge>
                            </div>
                          <p className="text-xs text-gray-600">{task.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
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
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Instructions */}
              <div className="bg-blue-50 p-2 rounded-lg">
                <h4 className="font-medium text-blue-900 text-sm mb-2">How to use:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Drag entire groups to assign all tasks in the group</li>
                  <li>• Drag individual tasks within groups</li>
                  <li>• Drag individual tasks from the tasks section</li>
                  <li>• Choose who gets the task after dropping</li>
                  <li>• Remove with trash icons</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Task Selection Modal */}
        <Dialog open={showTaskSelection} onOpenChange={setShowTaskSelection}>
          <DialogContent className="sm:max-w-2xl bg-white">
            <DialogHeader>
              <DialogTitle>Select Tasks from {selectedTaskGroup?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <p className="text-sm text-gray-600">
                Choose which tasks from the "{selectedTaskGroup?.name}" group you want to assign. You can select individual tasks or all tasks.
              </p>
              
              <div className="flex items-center space-x-4 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllTasks}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAllTasks}
                  className="text-gray-600 border-gray-600 hover:bg-gray-50"
                >
                  Deselect All
                </Button>
                <div className="text-sm text-gray-600">
                  {selectedTasksInGroup.length} of {selectedTaskGroup?.tasks.length || 0} tasks selected
                </div>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedTaskGroup?.tasks.map((task) => {
                  const isSelected = selectedTasksInGroup.some(t => t.id === task.id)
                  return (
                    <label
                      key={task.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleTaskSelection(task, e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900">{task.name}</div>
                        <div className="text-xs text-gray-600">{task.description}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {task.points}pts
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {task.estimatedMinutes}min
                          </Badge>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowTaskSelection(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmTaskSelection}
                  disabled={selectedTasksInGroup.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Continue with {selectedTasksInGroup.length} selected tasks
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Apply To Popup */}
        <Dialog open={showApplyToPopup} onOpenChange={setShowApplyToPopup}>
          <DialogContent className="sm:max-w-lg bg-white">
            <DialogHeader>
              <DialogTitle>Apply Tasks To</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Task Name Input */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Task Name</Label>
                <Input
                  value={editableTaskName}
                  onChange={(e) => setEditableTaskName(e.target.value)}
                  placeholder="Enter task name..."
                  className="w-full"
                />
              </div>
              
              {/* Day Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">When should this task be done?</Label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-gray-50">
                    <input
                      type="radio"
                      name="dayMode"
                      value="single"
                      checked={daySelection.mode === 'single'}
                      onChange={() => setDaySelection({ mode: 'single', selectedDays: [pendingDrop?.targetDay || ''] })}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 ${daySelection.mode === 'single' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}></div>
                    <div>
                      <div className="font-medium text-sm">Just {pendingDrop?.targetDay}</div>
                      <div className="text-xs text-gray-500">Only on the day you dropped it</div>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-gray-50">
                    <input
                      type="radio"
                      name="dayMode"
                      value="everyday"
                      checked={daySelection.mode === 'everyday'}
                      onChange={() => setDaySelection({ mode: 'everyday', selectedDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] })}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 ${daySelection.mode === 'everyday' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}></div>
                    <div>
                      <div className="font-medium text-sm">Every day</div>
                      <div className="text-xs text-gray-500">All 7 days of the week</div>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-gray-50">
                    <input
                      type="radio"
                      name="dayMode"
                      value="custom"
                      checked={daySelection.mode === 'custom'}
                      onChange={() => setDaySelection({ mode: 'custom', selectedDays: [pendingDrop?.targetDay || ''] })}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 ${daySelection.mode === 'custom' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}></div>
                    <div>
                      <div className="font-medium text-sm">Select specific days</div>
                      <div className="text-xs text-gray-500">Choose which days of the week</div>
                    </div>
                  </label>
                </div>
                
                {/* Custom Day Selection */}
                {daySelection.mode === 'custom' && (
                  <div className="ml-6 space-y-2">
                    <div className="text-xs text-gray-600 mb-2">Select days:</div>
                    <div className="grid grid-cols-7 gap-2">
                      {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => {
                        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                        const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day)
                        const isSelected = daySelection.selectedDays.includes(day)
                        
                        return (
                          <label
                            key={day}
                            className={`flex flex-col items-center p-2 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setDaySelection(prev => ({
                                    ...prev,
                                    selectedDays: [...prev.selectedDays, day]
                                  }))
                                } else {
                                  setDaySelection(prev => ({
                                    ...prev,
                                    selectedDays: prev.selectedDays.filter(d => d !== day)
                                  }))
                                }
                              }}
                              className="sr-only"
                            />
                            <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                            <span className="text-xs font-medium mt-1">{dayNames[dayIndex]}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Family Member Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">Who should do this task?</Label>
                <div className="space-y-2">
                  {applyToOptions.map((option) => (
                    <label key={option.id} className="flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-gray-50">
                      <input
                        type="radio"
                        name="whoOption"
                        value={option.id}
                        checked={selectedWhoOption === option.id}
                        onChange={() => setSelectedWhoOption(option.id)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 ${selectedWhoOption === option.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}></div>
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
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <Button
                  onClick={() => handleApplyToSelection(selectedWhoOption)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Task Mini Popup */}
        {showTaskMiniPopup && selectedTaskForEdit && miniPopupPosition && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowTaskMiniPopup(false)}
          >
            <div
              className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 min-w-[320px] max-w-[400px]"
              style={{
                left: `${miniPopupPosition.x}px`,
                top: `${miniPopupPosition.y}px`,
                transform: 'translate(-50%, -100%)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with actions */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedTaskForEdit.task.name}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEditTask()
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    title="Edit task"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteTask()
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete task"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowTaskMiniPopup(false)
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    title="Close"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                {/* Date and Time */}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="capitalize">{selectedTaskForEdit.day} • {new Date().toLocaleDateString()}</span>
                </div>

                {/* Points */}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span>{selectedTaskForEdit.task.points} points</span>
                </div>

                {/* Assigned to */}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Assigned to {enhancedFamilyMembers.find(m => m.id === selectedTaskForEdit.memberId)?.name || 'Unknown'}</span>
                </div>

                {/* Task Type */}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="capitalize">{selectedTaskForEdit.task.from_group ? 'Group task' : 'Individual task'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Routine Details Modal */}
        <RoutineDetailsModal
          isOpen={showRoutineDetails}
          onClose={() => setShowRoutineDetails(false)}
          onSave={handleSaveRoutineDetails}
          initialScheduleData={routineScheduleData || undefined}
          totalTasks={totalTasks}
          familyMembers={enhancedFamilyMembers.length}
        />
      </div>
    </div>
  )
}
