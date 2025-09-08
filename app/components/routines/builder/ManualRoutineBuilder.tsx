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
import { ArrowLeft, Plus, Trash2, Save, GripVertical, User, Folder, Users, Baby, UserCheck, Check, ChevronLeft, ChevronRight, ListTodo, Settings } from 'lucide-react'
import type { FamilyMember } from '../../../lib/api'
import { apiService, createRoutineDraft, patchRoutine, addRoutineGroup, addRoutineTask, deleteRoutineGroup, deleteRoutineTask, updateOnboardingStep, listLibraryGroups, listLibraryTasks, getOnboardingRoutine, getRoutineGroups, getRoutineTasks, createTaskAssignment, getRoutineAssignments, createRoutineSchedule, generateTaskInstances, getRoutineSchedules } from '../../../lib/api'
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
}

interface DaySelection {
  mode: 'single' | 'everyday' | 'custom'
  selectedDays: string[]
}

export default function ManualRoutineBuilder({ familyId: propFamilyId, onComplete, isEditMode = false, onBack }: ManualRoutineBuilderProps = {}) {
  console.log('ManualRoutineBuilder: Component mounted with props:', { propFamilyId, isEditMode, hasOnComplete: !!onComplete, hasOnBack: !!onBack });
  const router = useRouter()
  const sp = useSearchParams()
  const familyId = propFamilyId || sp?.get("family")
  console.log('ManualRoutineBuilder: Final familyId:', familyId)
  
  // Debug component lifecycle
  useEffect(() => {
    console.log('ManualRoutineBuilder: Component mounted/updated')
    return () => {
      console.log('ManualRoutineBuilder: Component unmounting')
    }
  }, [])
  
  const [routine, setRoutine] = useState<{ id: string; family_id: string; name: string; status: "draft"|"active"|"archived" }|null>(null)
  const [routineName, setRoutineName] = useState('My Routine')
  const [draggedItem, setDraggedItem] = useState<{ type: 'task' | 'group', item: Task | TaskGroup } | null>(null)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)
  const [showApplyToPopup, setShowApplyToPopup] = useState(false)
  const [showOnlyTasks, setShowOnlyTasks] = useState(false)
  const [showOnlyGroups, setShowOnlyGroups] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [isSavingProgress, setIsSavingProgress] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showRoutineDetails, setShowRoutineDetails] = useState(false)
  const [routineScheduleData, setRoutineScheduleData] = useState<RoutineScheduleData | null>(null)
  const [daySelection, setDaySelection] = useState<DaySelection>({ mode: 'single', selectedDays: [] })

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

  // Load all initial data (family members, existing routine, and library data)
  useEffect(() => {
    let isMounted = true;
    
    const loadAllData = async () => {
      if (!familyId) {
        router.push("/onboarding"); // safety
        return;
      }
      
      console.log('ManualRoutineBuilder: Starting loadAllData, familyId:', familyId, 'isEditMode:', isEditMode);
      
      setBusy(true);
      setLibraryLoading(true);
      setError(null);
      
      try {
        console.log('Starting to load all data for family:', familyId);
        
        // Check current onboarding step and only update if needed (skip in edit mode)
        if (!isEditMode) {
          console.log('ManualRoutineBuilder: Checking current onboarding step...');
          try {
            const onboardingStatus = await apiService.getOnboardingStatus();
            console.log('Current onboarding status:', onboardingStatus);
            
            if (onboardingStatus.has_family && onboardingStatus.in_progress) {
              const currentStep = onboardingStatus.in_progress.setup_step;
              console.log('Current step:', currentStep);
              
              if (currentStep !== 'create_routine') {
                console.log('Updating step from', currentStep, 'to create_routine');
                await updateOnboardingStep(familyId, "create_routine");
                console.log('ManualRoutineBuilder: Onboarding step updated successfully');
              } else {
                console.log('Step already set to create_routine, skipping update');
              }
            } else {
              console.log('No onboarding in progress, updating step to create_routine');
              await updateOnboardingStep(familyId, "create_routine");
              console.log('ManualRoutineBuilder: Onboarding step updated successfully');
            }
          } catch (error) {
            console.log('ManualRoutineBuilder: Error checking/updating step:', error);
          }
        } else {
          console.log('ManualRoutineBuilder: In edit mode, skipping onboarding step update');
        }
        
        // Load all data concurrently
        const [members, groupsData, tasksData] = await Promise.all([
          apiService.getFamilyMembers(familyId),
          listLibraryGroups('', true),
          listLibraryTasks('')
        ]);
        
        console.log('All API data loaded:', { members, groupsData, tasksData });
        
        // Try to load existing active routine
        let existingRoutine = null;
        try {
          console.log('Loading existing routines for family...');
          const routines = await apiService.makeRequest<any[]>(`/routines?family_id=${familyId}`);
          console.log('Routines found:', routines);
          
          // Find the active routine
          existingRoutine = routines.find(r => r.status === 'active');
          
          if (existingRoutine) {
            console.log('Active routine found:', existingRoutine);
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
            console.log('No active routine found, will create new one when needed');
          }
        } catch (e: any) {
          console.warn('Error loading routines:', e);
        }
        
        // Set family members
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
        
        console.log('All data loaded successfully');
      } catch (e: any) {
        console.error('Error loading data:', e);
        setError(e?.message || "Failed to load data");
      } finally {
        if (isMounted) {
          setBusy(false);
          setLibraryLoading(false);
        }
      }
    }

    loadAllData()
    
    return () => {
      isMounted = false;
    }
  }, [familyId]) // Removed router dependency to prevent unnecessary re-runs



  // Library data from API
  const [libraryGroups, setLibraryGroups] = useState<TaskGroup[]>([])
  const [libraryTasks, setLibraryTasks] = useState<Task[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)

  // Pre-defined task groups (now using API data)
  const [predefinedGroups] = useState<TaskGroup[]>([])

  // Pre-defined individual tasks (now using API data)
  const [predefinedTasks] = useState<Task[]>([])



  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'task' | 'group', item: Task | TaskGroup) => {
    setDraggedItem({ type, item })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDropOnDay = (e: React.DragEvent, day: string) => {
    e.preventDefault()
    if (!draggedItem || !selectedMemberId) return

    const member = enhancedFamilyMembers.find(m => m.id === selectedMemberId)
    if (!member) return

    // Set up pending drop and show popup
    setPendingDrop({
      type: draggedItem.type,
      item: draggedItem.item,
      targetMemberId: selectedMemberId,
      targetMemberName: member.name,
      targetDay: day
    })
    
    // Initialize day selection with the dropped day
    setDaySelection({ mode: 'single', selectedDays: [day] })
    
    setShowApplyToPopup(true)
    setDraggedItem(null)
  }

  const handleApplyToSelection = async (applyToId: string) => {
    if (!pendingDrop) return

    // Determine which days to add the task to based on day selection
    let targetDays: string[] = []
    
    if (daySelection.mode === 'single') {
      targetDays = [pendingDrop.targetDay]
    } else if (daySelection.mode === 'everyday') {
      targetDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    } else if (daySelection.mode === 'custom') {
      targetDays = daySelection.selectedDays
    }

    // Add task/group to all selected days (only UI updates, no backend calls)
    for (const day of targetDays) {
      if (pendingDrop.type === 'task') {
        addTaskToCalendarUI(pendingDrop.targetMemberId, pendingDrop.item as Task, applyToId, day)
      } else if (pendingDrop.type === 'group') {
        addGroupToCalendarUI(pendingDrop.targetMemberId, pendingDrop.item as TaskGroup, applyToId, day)
      }
    }

    // Close popup and reset
    setShowApplyToPopup(false)
    setPendingDrop(null)
    setDaySelection({ mode: 'single', selectedDays: [] })
  }

  // UI-only function for adding groups to calendar (no backend calls)
  const addGroupToCalendarUI = (memberId: string, group: TaskGroup, applyTo: string, day: string) => {
    const applyToOption = applyToOptions.find(option => option.id === applyTo)
    if (!applyToOption) return

    // Add group to calendar for the specified day
    setCalendarTasks(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        groups: [...prev[day].groups, { 
          ...group, 
          id: `${group.id}-${memberId}-${day}-${Date.now()}`,
          template_id: group.id, // Store the original template ID
          is_saved: false // Mark as unsaved
        }]
      }
    }))
    
    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
  }

  const addGroupToCalendar = async (memberId: string, group: TaskGroup, applyTo: string, day: string, routineData?: any) => {
    // Use provided routine data or ensure routine exists
    const routine = routineData || await ensureRoutineExists();
    if (!routine) return;
    
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
    
    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
  }

  // UI-only function for adding tasks to calendar (no backend calls)
  const addTaskToCalendarUI = (memberId: string, task: Task, applyTo: string, day: string) => {
    const applyToOption = applyToOptions.find(option => option.id === applyTo)
    if (!applyToOption) return

    // Add task to calendar for the specified day
    setCalendarTasks(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        individualTasks: [...prev[day].individualTasks, { 
          ...task, 
          id: `${task.id}-${memberId}-${day}-${Date.now()}`,
          template_id: task.id, // Store the original template ID
          is_saved: false // Mark as unsaved
        }]
      }
    }))
    
    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
  }

  const addTaskToCalendar = async (memberId: string, task: Task, applyTo: string, day: string, routineData?: any) => {
    // Use provided routine data or ensure routine exists
    const routine = routineData || await ensureRoutineExists();
    if (!routine) return;
    
    const applyToOption = applyToOptions.find(option => option.id === applyTo)
    if (!applyToOption) return

    const targetMembers = applyTo === 'none' 
      ? enhancedFamilyMembers.filter(m => m.id === memberId)
      : applyToOption.filter(enhancedFamilyMembers)

    // Add task to calendar for the specified day
    setCalendarTasks(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        individualTasks: [...prev[day].individualTasks, { 
          ...task, 
          id: `${task.id}-${memberId}-${day}-${Date.now()}`,
          template_id: task.id // Store the original template ID
        }]
      }
    }))
    
    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
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

  const removeTaskFromCalendar = (day: string, taskId: string) => {
    setCalendarTasks(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        individualTasks: prev[day].individualTasks.filter((task: Task) => task.id !== taskId)
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
      console.log('Routine schedule saved successfully:', scheduleData)
    } catch (err) {
      console.error('Error saving routine details:', err)
      setError('Failed to save routine details. Please try again.')
    }
  }

  const handleSaveRoutine = async () => {
    console.log('ManualRoutineBuilder: handleSaveRoutine called, isEditMode:', isEditMode, 'onComplete:', !!onComplete);
    setBusy(true)
    try {
      // First save any unsaved progress
      if (hasUnsavedChanges) {
        await saveProgress();
      }
      
      // Ensure routine exists (create if needed)
      const routineData = await ensureRoutineExists();
      if (!routineData) {
        setError('Failed to create routine. Please try again.');
        return;
      }
      
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
        console.log('Routine schedule created successfully')
      } catch (scheduleError) {
        console.error('Failed to create routine schedule:', scheduleError)
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
          console.error('Failed to generate task instances:', error)
          // Don't fail the whole process if instance generation fails
        }
      }
      
      // If we have an onComplete callback and we're not in edit mode (onboarding flow), mark onboarding as completed
      if (onComplete && !isEditMode) {
        console.log('ManualRoutineBuilder: Calling onComplete (onboarding flow)');
        // Mark onboarding as completed via API
        try {
          await apiService.completeOnboarding(familyId!)
        } catch (error) {
          console.error('Failed to mark onboarding as completed:', error)
        }
        onComplete()
      } else if (!isEditMode) {
        console.log('ManualRoutineBuilder: Navigating to dashboard (standalone mode)');
        // Otherwise, navigate to dashboard (standalone mode)
        router.push('/dashboard')
      } else {
        console.log('ManualRoutineBuilder: In edit mode, staying in routine builder');
      }
      // If isEditMode is true, stay in the routine builder (don't call onComplete or navigate)
    } catch (error) {
      console.error('Failed to save routine:', error)
      setError('Failed to save routine. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const getTotalTasksForDay = (day: string) => {
    const dayTasks = calendarTasks[day]
    return dayTasks.groups.reduce((sum: number, group: TaskGroup) => sum + group.tasks.length, 0) + dayTasks.individualTasks.length
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
      console.log('Creating routine draft lazily...');
      const created = await createRoutineDraft(familyId, routineName);
      console.log('Routine draft created:', created);
      const routineData = {
        id: created.id,
        family_id: created.family_id,
        name: created.name,
        status: created.status as "draft"|"active"|"archived"
      };
      setRoutine(routineData);
      return routineData;
    } catch (e: any) {
      console.error('Error creating routine:', e);
      setError(e?.message || "Failed to create routine");
      return null;
    }
  };

  // Load existing routine data (groups and tasks)
  const loadExistingRoutineData = async (routineId: string, enhancedMembers: any[]) => {
    try {
      console.log('Loading existing routine data...');
      
      // Load groups and tasks first
      const [groups, tasks] = await Promise.all([
        getRoutineGroups(routineId),
        getRoutineTasks(routineId)
      ]);
      
      // Try to load assignments (might not exist yet)
      let assignments: Array<{
        id: string;
        routine_task_id: string;
        member_id: string;
        order_index: number;
      }> = [];
      try {
        assignments = await getRoutineAssignments(routineId);
      } catch (e: any) {
        console.log('No task assignments found yet, will create them when tasks are saved');
      }
      
      console.log('Loaded groups:', groups);
      console.log('Loaded tasks:', tasks);
      console.log('Loaded assignments:', assignments);
      
      // Transform backend data to frontend format
      const transformedGroups: TaskGroup[] = groups.map(group => ({
        id: group.id,
        name: group.name,
        description: '',
        tasks: [], // We'll populate this with tasks that belong to this group
        color: 'bg-blue-100 border-blue-300',
        time_of_day: group.time_of_day as "morning" | "afternoon" | "evening" | "night" | undefined,
        is_saved: true, // These are already saved in the backend
        template_id: undefined // We don't have this info from the backend yet
      }));
      
      // Transform backend data to frontend format, preserving group_id for processing
      const transformedTasksWithGroupId = tasks.map(task => ({
        id: task.id,
        name: task.name,
        description: task.description || '',
        points: task.points,
        estimatedMinutes: task.duration_mins || 5,
        time_of_day: task.time_of_day as "morning" | "afternoon" | "evening" | "night" | undefined,
        is_saved: true, // These are already saved in the backend
        template_id: undefined, // We don't have this info from the backend yet
        group_id: task.group_id // Keep this for processing, then remove it
      }));
      
      console.log('Transformed groups:', transformedGroups);
      console.log('Transformed tasks with group_id:', transformedTasksWithGroupId);
      
      // Create a map of task assignments by member
      const assignmentsByMember = new Map<string, string[]>(); // memberId -> taskIds
      for (const assignment of assignments) {
        const memberId = assignment.member_id;
        const taskId = assignment.routine_task_id;
        if (!assignmentsByMember.has(memberId)) {
          assignmentsByMember.set(memberId, []);
        }
        assignmentsByMember.get(memberId)!.push(taskId);
      }
      
      console.log('Assignments by member:', assignmentsByMember);
      
      // Separate tasks that belong to groups vs individual tasks
      const individualTasks = transformedTasksWithGroupId.filter(task => !task.group_id);
      const groupTasks = transformedTasksWithGroupId.filter(task => task.group_id);
      
      // Assign tasks to their respective groups
      const groupsWithTasks = transformedGroups.map(group => ({
        ...group,
        tasks: groupTasks
          .filter(task => task.group_id === group.id)
          .map(task => {
            // Remove group_id to match Task interface
            const { group_id, ...taskWithoutGroupId } = task;
            return taskWithoutGroupId;
          })
      }));
      
      // Remove group_id from individual tasks to match Task interface
      const individualTasksWithoutGroupId = individualTasks.map(task => {
        const { group_id, ...taskWithoutGroupId } = task;
        return taskWithoutGroupId;
      });
      
      // Distribute tasks and groups to the correct family members
      console.log('Current enhanced family members:', enhancedMembers);
      console.log('Assignments by member:', assignmentsByMember);
      console.log('Individual tasks without group_id:', individualTasksWithoutGroupId);
      
      setEnhancedFamilyMembers(members =>
        members.map(member => {
          const memberTaskIds = assignmentsByMember.get(member.id) || [];
          const memberIndividualTasks = individualTasksWithoutGroupId.filter(task => 
            memberTaskIds.includes(task.id)
          );
          
          console.log(`Member ${member.name} (${member.id}):`, {
            memberTaskIds,
            memberIndividualTasks: memberIndividualTasks.length
          });
          
          return {
            ...member,
            groups: groupsWithTasks, // For now, all groups go to all members
            individualTasks: memberIndividualTasks
          };
        })
      );
      
      console.log('Loaded routine data with proper task assignments');
      
      // Load routine schedule data
      try {
        console.log('Loading routine schedule data...');
        const schedules = await getRoutineSchedules(routineId);
        console.log('Loaded schedules:', schedules);
        
        // Find the active schedule
        const activeSchedule = schedules.find(s => s.is_active);
        if (activeSchedule) {
          console.log('Active schedule found:', activeSchedule);
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
          console.log('Set routine schedule data:', scheduleData);
        } else {
          console.log('No active schedule found');
        }
      } catch (scheduleError: any) {
        console.log('No schedule data found or error loading schedule:', scheduleError);
        // This is not a critical error, so we don't set an error state
      }
      
    } catch (e: any) {
      console.error('Error loading routine data:', e);
    }
  };

  // Save progress function
  const saveProgress = async () => {
    if (!routineName.trim()) return;
    
    setIsSavingProgress(true);
    try {
      // Ensure routine exists
      const routineData = await ensureRoutineExists();
      if (!routineData) {
        setError('Failed to create routine. Please try again.');
        return;
      }
      
      // Update routine name if changed
      if (routineData.name !== routineName.trim()) {
        await patchRoutine(routineData.id, { name: routineName.trim() });
      }
      
      // Collect all unique unsaved tasks and groups from calendar
      const allGroups = new Map<string, TaskGroup>();
      const allTasks = new Map<string, Task>();
      const taskAssignments = new Map<string, { memberIds: string[], days: string[] }>(); // taskId -> {memberIds, days}
      const groupAssignments = new Map<string, { memberIds: string[], days: string[] }>(); // groupId -> {memberIds, days}
      
      for (const [day, dayTasks] of Object.entries(calendarTasks)) {
        // Collect unsaved groups for this day
        for (const group of dayTasks.groups) {
          if (!group.is_saved && !allGroups.has(group.id)) {
            allGroups.set(group.id, group);
            groupAssignments.set(group.id, { memberIds: [], days: [] });
          }
          if (!group.is_saved) {
            const assignment = groupAssignments.get(group.id)!;
            if (!assignment.memberIds.includes(selectedMemberId!)) {
              assignment.memberIds.push(selectedMemberId!);
            }
            if (!assignment.days.includes(day)) {
              assignment.days.push(day);
            }
          }
        }
        
        // Collect unsaved individual tasks for this day
        for (const task of dayTasks.individualTasks) {
          if (!task.is_saved && !allTasks.has(task.id)) {
            allTasks.set(task.id, task);
            taskAssignments.set(task.id, { memberIds: [], days: [] });
          }
          if (!task.is_saved) {
            const assignment = taskAssignments.get(task.id)!;
            if (!assignment.memberIds.includes(selectedMemberId!)) {
              assignment.memberIds.push(selectedMemberId!);
            }
            if (!assignment.days.includes(day)) {
              assignment.days.push(day);
            }
          }
        }
      }
      
      // Save unique groups
      const savedGroups = new Map<string, string>(); // originalId -> savedId
      for (const [originalId, group] of allGroups) {
        try {
          const savedGroup = await addRoutineGroup(routineData.id, {
            name: group.name,
            time_of_day: group.time_of_day,
            from_group_template_id: group.is_system ? group.template_id : undefined
          });
          savedGroups.set(originalId, savedGroup.id);
          
          // Mark group as saved in the UI state
          setEnhancedFamilyMembers(members =>
            members.map(member => ({
              ...member,
              groups: member.groups.map((g: TaskGroup) => 
                g.id === originalId ? { ...g, is_saved: true } : g
              )
            }))
          );
        } catch (e: any) {
          console.error('Error saving group:', e);
        }
      }
      
      // Save unique tasks
      const savedTasks = new Map<string, string>(); // originalId -> savedId
      for (const [originalId, task] of allTasks) {
        try {
          const assignment = taskAssignments.get(originalId);
          const daysOfWeek = assignment?.days || [];
          
          const savedTask = await addRoutineTask(routineData.id, {
            name: task.name,
            description: task.description,
            points: task.points,
            duration_mins: task.estimatedMinutes,
            time_of_day: task.time_of_day,
            days_of_week: daysOfWeek,
            from_task_template_id: task.is_system ? task.template_id : undefined
          });
          savedTasks.set(originalId, savedTask.id);
          
          // Mark task as saved in the UI state
          setCalendarTasks(prev => {
            const newCalendarTasks = { ...prev };
            for (const day of daysOfWeek) {
              newCalendarTasks[day] = {
                ...newCalendarTasks[day],
                individualTasks: newCalendarTasks[day].individualTasks.map((t: Task) => 
                  t.id === originalId ? { ...t, is_saved: true } : t
                )
              };
            }
            return newCalendarTasks;
          });
        } catch (e: any) {
          console.error('Error saving task:', e);
        }
      }
      
      // Create task assignments for individual tasks
      for (const [originalTaskId, assignment] of taskAssignments) {
        const savedTaskId = savedTasks.get(originalTaskId);
        if (savedTaskId) {
          for (const memberId of assignment.memberIds) {
            try {
              await createTaskAssignment(routineData.id, savedTaskId, memberId);
              console.log(`Assigned task ${savedTaskId} to member ${memberId} for days: ${assignment.days.join(', ')}`);
            } catch (e: any) {
              console.error('Error creating task assignment:', e);
            }
          }
        }
      }
      
      // TODO: Add group assignments (for now, groups are just templates)
      console.log('Saved groups:', savedGroups);
      console.log('Saved tasks:', savedTasks);
      console.log('Task assignments created successfully');
      
      setHasUnsavedChanges(false);
      setError(null);
    } catch (e: any) {
      console.error('Error saving progress:', e);
      setError(e?.message || 'Failed to save progress. Please try again.');
    } finally {
      setIsSavingProgress(false);
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
                    <div className="flex-1 max-w-md">
                      <Label className="text-sm font-medium text-gray-700">Select Family Member</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {enhancedFamilyMembers.map((member) => {
                          const colors = getMemberColors(member.color)
                          return (
                            <label
                              key={member.id}
                              className={`flex items-center space-x-2 p-2 rounded-lg border-2 cursor-pointer transition-all ${
                                selectedMemberId === member.id
                                  ? `${colors.border} ${colors.bg} border-opacity-100`
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="selectedMember"
                                value={member.id}
                                checked={selectedMemberId === member.id}
                                onChange={(e) => setSelectedMemberId(e.target.value)}
                                className="sr-only"
                              />
                              <div className={`w-3 h-3 rounded-full ${selectedMemberId === member.id ? colors.border.replace('border-', 'bg-') : 'bg-gray-300'}`}></div>
                              <span className="text-sm font-medium text-gray-900">{member.name}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                    
                    {(hasUnsavedChanges || routine) && routineName.trim() && (
                      <div className="flex-shrink-0">
                        <Button
                          onClick={saveProgress}
                          disabled={isSavingProgress}
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          {isSavingProgress ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                              Saving...
                            </>
                          ) : (
                            'Save Progress'
                          )}
                        </Button>
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

            {/* Calendar Grid */}
            {selectedMemberId && (
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-0">
                  <div className="grid grid-cols-7 gap-0 min-h-96">
                    {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => {
                      const dayTasks = calendarTasks[day]
                      const totalDayTasks = getTotalTasksForDay(day)
                      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                      const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day)
                      
                      return (
                        <div
                          key={day}
                          className={`border-r border-gray-200 last:border-r-0 p-3 min-h-96 ${
                            totalDayTasks === 0 ? 'bg-gray-50' : 'bg-white'
                          }`}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDropOnDay(e, day)}
                        >
                          {/* Day Header */}
                          <div className="text-center mb-3">
                            <div className="text-sm font-semibold text-gray-700">{dayNames[dayIndex]}</div>
                            <div className="text-xs text-gray-500 capitalize">{day}</div>
                          </div>

                          {/* Tasks Area */}
                          <div className="space-y-2">
                            {totalDayTasks === 0 ? (
                              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
                                <User className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                <p className="text-xs">Drop tasks here</p>
                              </div>
                            ) : (
                              <>
                                {/* Groups */}
                                {dayTasks.groups.map((group: TaskGroup) => (
                                  <div key={group.id} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-1">
                                        <Folder className="w-3 h-3 text-gray-600" />
                                        <span className="font-medium text-xs text-gray-900">{group.name}</span>
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
                                      <div key={task.id} className="ml-3 flex items-center space-x-1 p-1 bg-blue-50 rounded border border-gray-200">
                                        <div className="w-3 h-3 rounded border border-gray-400 flex items-center justify-center bg-white">
                                          {task.completed && <Check className="w-2 h-2 text-green-600" />}
                                        </div>
                                        <div className="flex-1">
                                          <div className="text-xs font-medium text-gray-900">{task.name}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ))}

                                {/* Individual Tasks */}
                                {dayTasks.individualTasks.map((task: Task) => (
                                  <div key={task.id} className="flex items-center space-x-1 p-1 bg-green-50 rounded border border-gray-200">
                                    <div className="w-3 h-3 rounded border border-gray-400 flex items-center justify-center bg-white">
                                      {task.completed && <Check className="w-2 h-2 text-green-600" />}
                                    </div>
                                    <div className="flex-1">
                                      <div className="text-xs font-medium text-gray-900">{task.name}</div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeTaskFromCalendar(day, task.id)}
                                      className="text-red-500 hover:text-red-700 h-4 w-4 p-0"
                                    >
                                      <Trash2 className="w-2 h-2" />
                                    </Button>
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
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'group', group)}
                        className={`p-2 rounded-lg border-2 cursor-move hover:shadow-md transition-all ${group.color}`}
                      >
                        <div className="flex items-start space-x-2">
                          <GripVertical className="w-4 h-4 text-gray-400 mt-0.5" />
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
                            <p className="text-xs text-gray-600 mb-2">{group.description}</p>
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
                  <div className="space-y-2">
                    {filteredTasks.map((task: Task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'task', task)}
                        className="p-1.5 bg-gray-50 rounded-lg border cursor-move hover:bg-gray-100 transition-colors"
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
                            <p className="text-xs text-gray-600 mb-1">{task.description}</p>
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
              <div className="bg-blue-50 p-2 rounded-lg">
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
          <DialogContent className="sm:max-w-lg bg-white">
            <DialogHeader>
              <DialogTitle>Apply Tasks To</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <p className="text-sm text-gray-600">
                You dropped {pendingDrop?.type === 'group' ? 'a group' : 'a task'} on <span className="font-medium capitalize">{pendingDrop?.targetDay}</span> for <span className="font-medium">{pendingDrop?.targetMemberName}</span>. 
                Who should receive {pendingDrop?.type === 'group' ? 'these tasks' : 'this task'}?
              </p>
              
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
            </div>
          </DialogContent>
        </Dialog>

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
