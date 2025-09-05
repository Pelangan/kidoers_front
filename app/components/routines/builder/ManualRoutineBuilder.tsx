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
import { apiService, createRoutineDraft, patchRoutine, addRoutineGroup, addRoutineTask, deleteRoutineGroup, deleteRoutineTask, updateOnboardingStep, listLibraryGroups, listLibraryTasks, getOnboardingRoutine, getRoutineGroups, getRoutineTasks, createTaskAssignment, getRoutineAssignments, createRoutineSchedule, generateTaskInstances } from '../../../lib/api'
import RoutineDetailsModal, { type RoutineScheduleData } from './RoutineDetailsModal'

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
}

export default function ManualRoutineBuilder({ familyId: propFamilyId, onComplete }: ManualRoutineBuilderProps = {}) {
  const router = useRouter()
  const sp = useSearchParams()
  const familyId = propFamilyId || sp?.get("family")
  
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

  // Load all initial data (family members, existing routine, and library data)
  useEffect(() => {
    let isMounted = true;
    
    const loadAllData = async () => {
      if (!familyId) {
        router.push("/onboarding"); // safety
        return;
      }
      
      console.log('ManualRoutineBuilder: Starting loadAllData, familyId:', familyId);
      
      setBusy(true);
      setLibraryLoading(true);
      setError(null);
      
      try {
        console.log('Starting to load all data for family:', familyId);
        
        // Check current onboarding step and only update if needed
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
        
        // Load all data concurrently
        const [members, groupsData, tasksData] = await Promise.all([
          apiService.getFamilyMembers(familyId),
          listLibraryGroups('', true),
          listLibraryTasks('')
        ]);
        
        console.log('All API data loaded:', { members, groupsData, tasksData });
        
        // Try to load existing onboarding routine
        let existingRoutine = null;
        try {
          console.log('Loading existing onboarding routine...');
          existingRoutine = await getOnboardingRoutine(familyId);
          console.log('Existing routine found:', existingRoutine);
          setRoutine({
            id: existingRoutine.id,
            family_id: existingRoutine.family_id,
            name: existingRoutine.name,
            status: existingRoutine.status as "draft"|"active"|"archived"
          });
          setRoutineName(existingRoutine.name);
          
          // Mark as having no unsaved changes since we just loaded the routine
          setHasUnsavedChanges(false);
        } catch (e: any) {
          // Check if this is an expected 404 (no routine exists yet)
          if (e.message && e.message.includes('404')) {
            console.log('No existing onboarding routine found, will create new one when needed');
          } else {
            // This is an unexpected error, log it but don't set error state
            console.warn('Unexpected error loading routine:', e);
          }
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

  const handleApplyToSelection = async (applyToId: string) => {
    if (!pendingDrop) return

    if (pendingDrop.type === 'task') {
      await addTaskToMember(pendingDrop.targetMemberId, pendingDrop.item as Task, applyToId)
    } else if (pendingDrop.type === 'group') {
      await addGroupToMember(pendingDrop.targetMemberId, pendingDrop.item as TaskGroup, applyToId)
    }

    // Close popup and reset
    setShowApplyToPopup(false)
    setPendingDrop(null)
  }

  const addGroupToMember = async (memberId: string, group: TaskGroup, applyTo: string) => {
    // Ensure routine exists before adding tasks
    const routineData = await ensureRoutineExists();
    if (!routineData) return;
    
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
            groups: [...member.groups, { 
              ...group, 
              id: `${group.id}-${member.id}-${Date.now()}`,
              template_id: group.id // Store the original template ID
            }]
          }
        }
        return member
      })
    )
    
    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
  }

  const addTaskToMember = async (memberId: string, task: Task, applyTo: string) => {
    // Ensure routine exists before adding tasks
    const routineData = await ensureRoutineExists();
    if (!routineData) return;
    
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
            individualTasks: [...member.individualTasks, { 
              ...task, 
              id: `${task.id}-${member.id}-${Date.now()}`,
              template_id: task.id // Store the original template ID
            }]
          }
        }
        return member
      })
    )
    
    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
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
      
      // Generate task instances if we have schedule data
      if (routineScheduleData && familyId) {
        try {
          const today = new Date()
          const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
          await generateTaskInstances(familyId, {
            start_date: today,
            end_date: nextWeek
          })
        } catch (error) {
          console.error('Failed to generate task instances:', error)
          // Don't fail the whole process if instance generation fails
        }
      }
      
      // If we have an onComplete callback (onboarding flow), mark onboarding as completed
      if (onComplete) {
        // Mark onboarding as completed via API
        try {
          await apiService.completeOnboarding(familyId!)
        } catch (error) {
          console.error('Failed to mark onboarding as completed:', error)
        }
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
      
      // Collect all unique unsaved tasks and groups across all family members
      const allGroups = new Map<string, TaskGroup>();
      const allTasks = new Map<string, Task>();
      const taskAssignments = new Map<string, string[]>(); // taskId -> memberIds
      const groupAssignments = new Map<string, string[]>(); // groupId -> memberIds
      
      for (const member of enhancedFamilyMembers) {
        // Collect unsaved groups
        for (const group of member.groups) {
          if (!group.is_saved && !allGroups.has(group.id)) {
            allGroups.set(group.id, group);
            groupAssignments.set(group.id, []);
          }
          if (!group.is_saved) {
            groupAssignments.get(group.id)!.push(member.id);
          }
        }
        
        // Collect unsaved individual tasks
        for (const task of member.individualTasks) {
          if (!task.is_saved && !allTasks.has(task.id)) {
            allTasks.set(task.id, task);
            taskAssignments.set(task.id, []);
          }
          if (!task.is_saved) {
            taskAssignments.get(task.id)!.push(member.id);
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
          const savedTask = await addRoutineTask(routineData.id, {
            name: task.name,
            description: task.description,
            points: task.points,
            duration_mins: task.estimatedMinutes,
            time_of_day: task.time_of_day,
            from_task_template_id: task.is_system ? task.template_id : undefined
          });
          savedTasks.set(originalId, savedTask.id);
          
          // Mark task as saved in the UI state
          setEnhancedFamilyMembers(members =>
            members.map(member => ({
              ...member,
              individualTasks: member.individualTasks.map((t: Task) => 
                t.id === originalId ? { ...t, is_saved: true } : t
              )
            }))
          );
        } catch (e: any) {
          console.error('Error saving task:', e);
        }
      }
      
      // Create task assignments for individual tasks
      for (const [originalTaskId, memberIds] of taskAssignments) {
        const savedTaskId = savedTasks.get(originalTaskId);
        if (savedTaskId) {
          for (const memberId of memberIds) {
            try {
              await createTaskAssignment(routineData.id, savedTaskId, memberId);
              console.log(`Assigned task ${savedTaskId} to member ${memberId}`);
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

            {/* Routine Details */}
            <Card className="bg-white border border-gray-200">
              <CardContent className="pt-2">
                <div className="space-y-2">
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
                    
                    {/* Routine Details Button */}
                    <div className="flex-shrink-0">
                      <Button
                        variant={routineScheduleData ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowRoutineDetails(true)}
                        disabled={busy}
                        className="flex items-center space-x-2"
                      >
                        <Settings className="h-4 w-4" />
                        <span>
                          {routineScheduleData ? 'Schedule Set' : 'Schedule'}
                        </span>
                        {routineScheduleData && (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                      </Button>
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

                </div>
              </CardContent>
            </Card>

            {/* Family Members Grid */}
            <div className="grid grid-cols-4 gap-4">
              {enhancedFamilyMembers.map((member) => {
                const totalTasks = getTotalTasks(member)
                
                return (
                  <Card 
                    key={member.id} 
                    className={`${member.color} ${member.borderColor} border-2 hover:shadow-lg transition-all min-h-64`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnMember(e, member.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-gray-900">{member.name}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-1">
                      {totalTasks === 0 ? (
                        <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                          <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Drop tasks here</p>
                          <p className="text-xs">Drag from the library panel</p>
                        </div>
                      ) : (
                        <>
                          {/* Groups */}
                          {member.groups.map((group: TaskGroup) => (
                            <div key={group.id} className="space-y-1">
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
                                <div key={task.id} className={`ml-4 flex items-center space-x-2 p-1.5 ${member.taskBgColor} rounded-lg border border-gray-200`}>
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
                            <div key={task.id} className={`flex items-center space-x-2 p-1.5 ${member.taskBgColor} rounded-lg border border-gray-200`}>
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
                        </>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

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
