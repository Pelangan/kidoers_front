'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "../../../../components/ui/button"
import { Input } from "../../../../components/ui/input"
import { Label } from "../../../../components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card"
import { Badge } from "../../../../components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../../components/ui/dialog"
import { ArrowLeft, Trash2, Save, GripVertical, User, Folder, Users, Baby, UserCheck, Check, Settings, Move, Plus, Loader2 } from 'lucide-react'
import { apiService, createRoutineDraft, patchRoutine, addRoutineGroup, addRoutineTask, deleteRoutineGroup, deleteRoutineTask, patchRoutineTask, updateOnboardingStep, getOnboardingRoutine, getRoutineGroups, getRoutineTasks, createTaskAssignment, getRoutineAssignments, createRoutineSchedule, generateTaskInstances, getRoutineSchedules, assignGroupTemplateToMembers, assignExistingGroupToMembers, getRoutineFullData, bulkUpdateDayOrders, bulkCreateIndividualTasks, bulkUpdateRecurringTasks, bulkDeleteTasks } from '../../../lib/api'
import { generateAvatarUrl } from '../../ui/AvatarSelector'
import RoutineDetailsModal from './RoutineDetailsModal'
import type { 
  ManualRoutineBuilderProps, 
  Task, 
  TaskGroup, 
  ApplyToOption, 
  PendingDrop, 
  DaySelection, 
  FamilyMember, 
  DaySpecificOrder, 
  BulkDayOrderUpdate, 
  RoutineScheduleData 
} from './types/routineBuilderTypes'
import { 
  extractMemberIdFromId, 
  extractRoutineTaskIdFromId, 
  getTotalTasksForDay, 
  deriveScheduleFromCalendar,
  getTaskFrequencyType,
  getTaskDaysOfWeek
} from './utils/taskUtils'
import { useRoutineData } from './hooks/useRoutineData'
import { useFamilyMembers } from './hooks/useFamilyMembers'
import { useCalendarTasks } from './hooks/useCalendarTasks'
import { useTaskModals } from './hooks/useTaskModals'
import { useTaskDragAndDrop } from './hooks/useTaskDragAndDrop'
import { FamilyMemberSelector } from './components/FamilyMemberSelector'
import { CalendarGrid } from './components/CalendarGrid'

// Day constants - Sunday moved to last position
const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']


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
  
  // Use routine data hook
  const {
    routine,
    routineName,
    isCreatingRoutine,
    hasUnsavedChanges,
    routineScheduleData,
    currentRoutineId,
    recurringTemplates,
    setRoutine,
    setRoutineName,
    setHasUnsavedChanges,
    setRoutineScheduleData,
    setCurrentRoutineId,
    setRecurringTemplates,
    ensureRoutineExists,
    handleSaveRoutineDetails,
    handleSaveRoutine
  } = useRoutineData(familyId, isEditMode, onComplete)
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)

  // Use task modals hook
  const {
    showApplyToPopup,
    showTaskMiniPopup,
    showDeleteConfirmModal,
    showRoutineDetails,
    showCreateGroupModal,
    editableTaskName,
    selectedTaskForEdit,
    miniPopupPosition,
    deleteScope,
    daySelection,
    selectedWhoOption,
    selectedRoutineGroup,
    isCreatingTasks,
    isDeletingTask,
    setShowApplyToPopup,
    setShowTaskMiniPopup,
    setShowDeleteConfirmModal,
    setShowRoutineDetails,
    setShowCreateGroupModal,
    setEditableTaskName,
    setSelectedTaskForEdit,
    setMiniPopupPosition,
    setDeleteScope,
    setDaySelection,
    setSelectedWhoOption,
    setSelectedRoutineGroup,
    setIsCreatingTasks,
    setIsDeletingTask,
    openTaskModal,
    closeTaskModal,
    openTaskMiniPopup,
    closeTaskMiniPopup,
    openDeleteConfirmModal,
    closeDeleteConfirmModal,
    openRoutineDetailsModal,
    closeRoutineDetailsModal,
    openCreateGroupModal,
    closeCreateGroupModal,
    resetFormState,
    closeAllModals
  } = useTaskModals()
  const [routineGroups, setRoutineGroups] = useState<TaskGroup[]>([])
  const [viewMode, setViewMode] = useState<'calendar' | 'group'>('calendar')

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

  // Use family members hook
  const {
    familyMembers,
    enhancedFamilyMembers,
    selectedMemberId,
    setFamilyMembers,
    setEnhancedFamilyMembers,
    setSelectedMemberId,
    loadFamilyMembers,
    getMemberColors,
    getSelectedMember,
    getMemberById,
    getMemberNameById
  } = useFamilyMembers(familyId)

  // Use calendar tasks hook
  const {
    calendarTasks,
    setCalendarTasks,
    addTaskToCalendarUI,
    addTaskToCalendar,
    removeGroupFromCalendar,
    addGroupToCalendar,
    addGroupToCalendarUI,
    updateCalendarTasks,
    getTotalTasks
  } = useCalendarTasks(selectedMemberId, ensureRoutineExists, setError)


  // Load all initial data (family members and existing routine)
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
        console.log('[KIDOERS-ROUTINE] 🔄 ManualRoutineBuilder: Starting API call...');
        
        // Load family members using the hook
        const enhanced = await loadFamilyMembers();
        
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
        
        
        // Load existing routine data after enhanced family members are set
        if (existingRoutine && enhanced) {
          await loadExistingRoutineData(existingRoutine.id, enhanced);
        }
        
        
        console.log('[KIDOERS-ROUTINE] All data loaded successfully');
      } catch (e: any) {
        console.error('[KIDOERS-ROUTINE] ','Error loading data:', e);
        setError(e?.message || "Failed to load data");
      } finally {
        if (isMounted) {
          setBusy(false);
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




  // Use task drag and drop hook
  const {
    draggedTask,
    dragOverPosition,
    dayOrders,
    isDragging,
    setDraggedTask,
    setDragOverPosition,
    setDayOrders,
    setIsDragging,
    handleTaskDragStart,
    handleTaskDragOver,
    handleTaskDragLeave,
    handleTaskDrop,
    handleTaskDragEnd,
    moveTaskToPosition,
    getTasksWithDayOrder,
    loadDayOrders
  } = useTaskDragAndDrop(updateCalendarTasks, extractRoutineTaskIdFromId, currentRoutineId)





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
        
        // Day orders are now handled by the drag and drop hook
        
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
    
    // Get the selected member name
    const memberName = getMemberNameById(selectedMemberId)
    
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
    
    // Create pending drop object for the popup
    const pendingDropData: PendingDrop = {
      type: 'task',
      item: newTask,
      targetMemberId: selectedMemberId,
      targetMemberName: memberName,
      targetDay: day
    }
    
    // Set up the popup state
    setPendingDrop(pendingDropData)
    setEditableTaskName('(No title)')
    setDaySelection({ mode: 'single', selectedDays: [day] })
    setSelectedWhoOption('none')
    setSelectedRoutineGroup('none')
    setShowApplyToPopup(true)
    
    console.log('[KIDOERS-ROUTINE] Apply To Popup opened for new task creation')
  }

  // Handle edit task - opens the Apply Tasks To modal
  const handleEditTask = async () => {
    if (!selectedTaskForEdit) return
    
    console.log('[TASK-EDIT] ===== EDIT TASK DEBUG START =====')
    console.log('[TASK-EDIT] Opening edit modal for task:', selectedTaskForEdit.task.name)
    console.log('[TASK-EDIT] Full task object:', selectedTaskForEdit.task)
    console.log('[TASK-EDIT] Task details:', {
      name: selectedTaskForEdit.task.name,
      days_of_week: selectedTaskForEdit.task.days_of_week,
      recurring_template_id: selectedTaskForEdit.task.recurring_template_id,
      template_id: selectedTaskForEdit.task.template_id,
      is_system: selectedTaskForEdit.task.is_system,
      memberId: selectedTaskForEdit.task.memberId,
      id: selectedTaskForEdit.task.id
    })
    
    // Refresh routine data to ensure we have the latest template information
    if (currentRoutineId) {
      console.log('[TASK-EDIT] 🔄 Refreshing routine data to get latest template info...')
      try {
        const fullData = await getRoutineFullData(currentRoutineId)
        setRecurringTemplates(fullData.recurring_templates || [])
        console.log('[TASK-EDIT] ✅ Updated recurring templates:', fullData.recurring_templates)
      } catch (error) {
        console.warn('[TASK-EDIT] ⚠️ Failed to refresh routine data:', error)
      }
    }
    
    // Check if this task appears on multiple days in the calendar
    const taskAppearsOnDays: string[] = []
    Object.keys(calendarTasks).forEach(day => {
      const dayTasks = calendarTasks[day].individualTasks || []
      const hasTaskOnDay = dayTasks.some(task => {
        // Check by name and member ID for recurring tasks
        return task.name === selectedTaskForEdit.task.name && 
               (task.memberId === selectedTaskForEdit.memberId || task.memberId === selectedTaskForEdit.task.memberId)
      })
      if (hasTaskOnDay) {
        taskAppearsOnDays.push(day)
      }
    })
    
    console.log('[TASK-EDIT] Task appears on days (from calendar):', taskAppearsOnDays)
    console.log('[TASK-EDIT] Task appears on', taskAppearsOnDays.length, 'days')
    
    // Set up the task for editing
    setPendingDrop({
      type: 'task',
      item: selectedTaskForEdit.task,
      targetMemberId: selectedTaskForEdit.memberId,
      targetMemberName: getMemberNameById(selectedTaskForEdit.memberId),
      targetDay: selectedTaskForEdit.day,
      fromGroup: undefined
    })
    
    // Get frequency information from recurring template
    console.log('[TASK-EDIT] 🔍 DEBUG: Available recurring templates:', recurringTemplates)
    console.log('[TASK-EDIT] 🔍 DEBUG: Task recurring_template_id:', selectedTaskForEdit.task.recurring_template_id)
    
    const frequencyType = getTaskFrequencyType(selectedTaskForEdit.task, recurringTemplates)
    const templateDaysOfWeek = getTaskDaysOfWeek(selectedTaskForEdit.task, recurringTemplates)
    
    console.log('[TASK-EDIT] Frequency information:', {
      frequencyType,
      templateDaysOfWeek,
      taskRecurringTemplateId: selectedTaskForEdit.task.recurring_template_id,
      availableTemplates: recurringTemplates.length
    })
    
    // Determine the correct day selection mode based on frequency type
    let daySelectionMode: 'single' | 'everyday' | 'custom' = 'single'
    let selectedDays: string[] = [selectedTaskForEdit.day]
    
    if (frequencyType === 'every_day') {
      daySelectionMode = 'everyday'
      selectedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    } else if (frequencyType === 'specific_days') {
      daySelectionMode = 'custom'
      // Always use the template days of week for specific_days tasks, as they represent the current state
      selectedDays = templateDaysOfWeek.length > 0 ? templateDaysOfWeek : taskAppearsOnDays
    } else {
      // 'just_this_day' - single day task
      daySelectionMode = 'single'
      selectedDays = [selectedTaskForEdit.day]
    }
    
    console.log('[TASK-EDIT] Final day selection:', { mode: daySelectionMode, selectedDays })
    
    // Initialize day selection with the correct mode based on template frequency
    // This will be set immediately before opening the modal
    setDaySelection({ mode: daySelectionMode, selectedDays: selectedDays })
    
    console.log('[TASK-EDIT] ===== EDIT TASK DEBUG END =====')
    
    // Close mini popup and prepare for modal
    closeTaskMiniPopup()
    setEditableTaskName(selectedTaskForEdit.task.name)
    setSelectedWhoOption('none')
    setSelectedRoutineGroup('none')
    
    // Use setTimeout to ensure state update happens before modal opens
    setTimeout(() => {
      setShowApplyToPopup(true)
    }, 0)
  }

  // Handle delete task
  const handleDeleteTask = async () => {
    if (!selectedTaskForEdit) return
    
    console.log('[TASK-DELETE] Deleting task:', selectedTaskForEdit.task.name)
    
    // Check if this recurring task exists on multiple days
    const taskName = selectedTaskForEdit.task.name
    const memberId = selectedTaskForEdit.memberId
    
    // Count how many days this recurring task appears on
    let taskAppearsOnDays = 0
    Object.keys(calendarTasks).forEach(day => {
      const dayTasks = calendarTasks[day].individualTasks || []
      const hasTaskOnDay = dayTasks.some(task => {
        // For recurring tasks, we match by name and member ID
        // This works even if tasks don't have recurring_template_id (legacy tasks)
        return task.name === taskName && task.memberId === memberId
      })
      if (hasTaskOnDay) {
        taskAppearsOnDays++
      }
    })
    
    console.log('[TASK-DELETE] Task appears on', taskAppearsOnDays, 'days')
    console.log('[TASK-DELETE] Selected task:', selectedTaskForEdit.task)
    console.log('[TASK-DELETE] Task name:', taskName, 'Member ID:', memberId)
    console.log('[TASK-DELETE] Should show modal?', taskAppearsOnDays > 1)
    
    // Debug: Check if tasks have recurring_template_id
    console.log('[TASK-DELETE] Selected task has recurring_template_id:', selectedTaskForEdit.task.recurring_template_id)
    console.log('[TASK-DELETE] Selected task has template_id:', selectedTaskForEdit.task.template_id)
    
    // Debug: Check each day's tasks
    Object.keys(calendarTasks).forEach(day => {
      const dayTasks = calendarTasks[day].individualTasks || []
      const matchingTasks = dayTasks.filter(task => 
        task.name === taskName && task.memberId === memberId
      )
      if (matchingTasks.length > 0) {
        console.log(`[TASK-DELETE] Day ${day} has ${matchingTasks.length} matching tasks:`, matchingTasks.map(t => ({id: t.id, name: t.name, memberId: t.memberId})))
      }
    })
    
    if (taskAppearsOnDays > 1) {
      // Show confirmation modal for multi-day tasks
      openDeleteConfirmModal()
      return
    }
    
    // For single-day tasks, delete immediately
    await performTaskDeletion('this_day')
  }

  // Perform the actual task deletion
  const performTaskDeletion = async (scope: 'this_day' | 'this_and_following' | 'all_days') => {
    if (!selectedTaskForEdit) return
    
    // Set deleting flag to prevent any popup from opening
    setIsDeletingTask(true)
    
    // Store task info before clearing state
    const taskToDelete = selectedTaskForEdit
    
    // Close popups
    closeAllModals()
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

        // Check if this is a recurring task
        console.log('[TASK-DELETE] 🔍 Task deletion debug:', {
          taskId: taskToDelete.task.id,
          taskName: taskToDelete.task.name,
          hasRecurringTemplateId: !!taskToDelete.task.recurring_template_id,
          recurringTemplateId: taskToDelete.task.recurring_template_id,
          hasTemplateId: !!taskToDelete.task.template_id,
          templateId: taskToDelete.task.template_id,
          isSystem: !!taskToDelete.task.is_system,
          routineId: routineData.id,
          scope: scope,
          targetDay: taskToDelete.day,
          memberId: taskToDelete.memberId,
          fullTaskObject: taskToDelete.task
        })
        
        // Check if this is a recurring task by looking at the task data or by checking if it appears on multiple days
        const isRecurringTask = taskToDelete.task.recurring_template_id || taskToDelete.task.template_id || taskToDelete.task.is_system
        
        // Additional check: if task appears on multiple days, it's likely recurring
        const taskAppearsOnMultipleDays = Object.keys(calendarTasks).filter(day => {
          const dayTasks = calendarTasks[day].individualTasks || []
          return dayTasks.some(task => task.name === taskToDelete.task.name && task.memberId === taskToDelete.memberId)
        }).length > 1
        
        const shouldUseBulkDelete = isRecurringTask || taskAppearsOnMultipleDays
        
        console.log('[TASK-DELETE] 🔍 Recurring task detection:', {
          isRecurringTask,
          taskAppearsOnMultipleDays,
          shouldUseBulkDelete,
          recurringTemplateId: taskToDelete.task.recurring_template_id
        })
        
        if (shouldUseBulkDelete) {
          // Use bulk delete for recurring tasks
          console.log('[TASK-DELETE] 🗑️ Using bulk delete for recurring task:', taskToDelete.task.name)
          console.log('[TASK-DELETE] 🔍 Task details:', {
            id: taskToDelete.task.id,
            recurring_template_id: taskToDelete.task.recurring_template_id,
            template_id: taskToDelete.task.template_id,
            is_system: taskToDelete.task.is_system
          })
          
          // For recurring tasks, we need to use the recurring_template_id, not the individual task id
          let taskTemplateId = taskToDelete.task.recurring_template_id || taskToDelete.task.template_id
          
          // Fallback: if we don't have the recurring_template_id, try to get it from the backend data
          if (!taskTemplateId) {
            console.log('[TASK-DELETE] 🔍 No recurring_template_id found, looking up in backend data...')
            // This should have been loaded in loadExistingRoutineData
            // For now, we'll use the task ID as fallback
            taskTemplateId = taskToDelete.task.id
          }
          
          // DEBUG: Check if the recurring_template_id matches what's in the database
          console.log('[TASK-DELETE] 🔍 DEBUG: Expected recurring_template_id from database: 93c6f050-b2e5-459f-b203-ead4d9303668')
          console.log('[TASK-DELETE] 🔍 DEBUG: Actual recurring_template_id from task:', taskToDelete.task.recurring_template_id)
          
          console.log('[TASK-DELETE] 🔍 Using task_template_id:', taskTemplateId)
          console.log('[TASK-DELETE] 🔍 Sending to backend:', {
            routine_id: routineData.id,
            task_template_id: taskTemplateId,
            delete_scope: scope,
            target_day: taskToDelete.day,
            member_id: taskToDelete.memberId
          })
          
          const result = await bulkDeleteTasks(routineData.id, {
            recurring_template_id: taskTemplateId,
            delete_scope: scope,
            target_day: taskToDelete.day,
            member_id: taskToDelete.memberId
          })
          console.log('[TASK-DELETE] ✅ Bulk delete result:', result)
          
          // Log cleanup results
          if (result.cleaned_templates && result.cleaned_templates.length > 0) {
            console.log('[TASK-DELETE] 🧹 Cleaned up orphaned templates:', result.cleaned_templates)
          }
        } else {
          // Use regular delete for custom tasks
          console.log('[TASK-DELETE] 🗑️ Deleting custom task from backend:', taskToDelete.task.id)
          await deleteRoutineTask(routineData.id, taskToDelete.task.id)
          console.log('[TASK-DELETE] ✅ Task deleted from backend successfully')
        }

        // Remove from calendar state based on scope
        setCalendarTasks(prev => {
          const newCalendarTasks = { ...prev }
          
          if (scope === 'this_day') {
            // Remove only from the current day
            // For recurring tasks, filter by recurring_template_id; for custom tasks, filter by id
            const recurringTaskId = taskToDelete.task.recurring_template_id || taskToDelete.task.template_id || taskToDelete.task.id
            
            newCalendarTasks[taskToDelete.day] = {
              ...newCalendarTasks[taskToDelete.day],
              individualTasks: newCalendarTasks[taskToDelete.day].individualTasks.filter(t => {
                if (taskToDelete.task.recurring_template_id || taskToDelete.task.template_id || taskToDelete.task.is_system) {
                  // For recurring tasks, filter by recurring_template_id
                  return (t.recurring_template_id !== recurringTaskId && t.template_id !== recurringTaskId && t.id !== recurringTaskId)
                } else {
                  // For custom tasks, filter by exact id
                  return t.id !== taskToDelete.task.id
                }
              })
            }
          } else if (scope === 'this_and_following') {
            // Remove from current day and all following days
            const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            const currentDayIndex = dayOrder.indexOf(taskToDelete.day)
            const followingDays = dayOrder.slice(currentDayIndex)
            
            // For recurring tasks, filter by recurring_template_id; for custom tasks, filter by id
            const recurringTaskId = taskToDelete.task.recurring_template_id || taskToDelete.task.template_id || taskToDelete.task.id
            
            console.log('[TASK-DELETE] 🎯 Frontend: Deleting from following days:', followingDays)
            console.log('[TASK-DELETE] 🎯 Frontend: Recurring task ID:', recurringTaskId)
            console.log('[TASK-DELETE] 🎯 Frontend: Task to delete:', taskToDelete.task)
            
            followingDays.forEach(day => {
              if (newCalendarTasks[day]) {
                const beforeCount = newCalendarTasks[day].individualTasks.length
                const isRecurring = taskToDelete.task.recurring_template_id || taskToDelete.task.template_id || taskToDelete.task.is_system
                
                newCalendarTasks[day] = {
                  ...newCalendarTasks[day],
                  individualTasks: newCalendarTasks[day].individualTasks.filter(t => {
                    if (isRecurring) {
                      // For recurring tasks, filter by recurring_template_id
                      const shouldKeep = (t.recurring_template_id !== recurringTaskId && t.template_id !== recurringTaskId && t.id !== recurringTaskId)
                      if (!shouldKeep) {
                        console.log(`[TASK-DELETE] 🗑️ Frontend: Removing recurring task from ${day}:`, t.name, t.id)
                      }
                      return shouldKeep
                    } else {
                      // For custom tasks, filter by exact id
                      return t.id !== taskToDelete.task.id
                    }
                  })
                }
                
                const afterCount = newCalendarTasks[day].individualTasks.length
                console.log(`[TASK-DELETE] 📊 Frontend: Day ${day}: ${beforeCount} → ${afterCount} tasks`)
              }
            })
          } else if (scope === 'all_days') {
            // Remove from all days
            // For recurring tasks, filter by recurring_template_id; for custom tasks, filter by id
            const recurringTaskId = taskToDelete.task.recurring_template_id || taskToDelete.task.template_id || taskToDelete.task.id
            
            Object.keys(newCalendarTasks).forEach(day => {
              newCalendarTasks[day] = {
                ...newCalendarTasks[day],
                individualTasks: newCalendarTasks[day].individualTasks.filter(t => {
                  if (taskToDelete.task.recurring_template_id || taskToDelete.task.template_id || taskToDelete.task.is_system) {
                    // For recurring tasks, filter by recurring_template_id
                    return (t.recurring_template_id !== recurringTaskId && t.template_id !== recurringTaskId && t.id !== recurringTaskId)
                  } else {
                    // For custom tasks, filter by exact id
                    return t.id !== taskToDelete.task.id
                  }
                })
              }
            })
          }
          
          return newCalendarTasks
        })
        
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

    setIsCreatingTasks(true)

    try {
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
        targetDays = DAYS_OF_WEEK
      } else if (daySelection.mode === 'custom') {
        targetDays = daySelection.selectedDays
      }

      console.log('[KIDOERS-ROUTINE] Target days:', targetDays)

      // Check if we're editing an existing recurring task
      const isEditingRecurringTask = selectedTaskForEdit && 
                                   selectedTaskForEdit.task.recurring_template_id && 
                                   pendingDrop.type === 'task' &&
                                   pendingDrop.item.id === selectedTaskForEdit.task.id

      console.log('[KIDOERS-ROUTINE] 🔍 Edit mode check:', {
        isEditingRecurringTask,
        hasSelectedTaskForEdit: !!selectedTaskForEdit,
        hasRecurringTemplateId: selectedTaskForEdit?.task.recurring_template_id,
        pendingDropType: pendingDrop.type,
        taskIdsMatch: selectedTaskForEdit?.task.id === pendingDrop.item.id
      })

      // Determine which members should receive the task based on applyToId
      let targetMemberIds: string[] = []
      
      console.log('[KIDOERS-ROUTINE] 🔍 Assignment Debug Info:')
      console.log('[KIDOERS-ROUTINE] - applyToId:', selectedApplyToId)
      console.log('[KIDOERS-ROUTINE] - enhancedFamilyMembers:', enhancedFamilyMembers)
      console.log('[KIDOERS-ROUTINE] - Member roles:', enhancedFamilyMembers.map(m => ({ id: m.id, name: m.name, type: m.type })))
      console.log('[KIDOERS-ROUTINE] - Full member details:', enhancedFamilyMembers.map(m => ({ 
        id: m.id, 
        name: m.name, 
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

      // Handle task creation with bulk API for better performance
      if (pendingDrop.type === 'task') {
        // Ensure routine exists first
        const routineData = await ensureRoutineExists();
        if (!routineData) {
          setError('Failed to create routine. Please try again.');
          return;
        }

        // Check if we're editing an existing recurring task
        if (isEditingRecurringTask && selectedTaskForEdit) {
          console.log('[KIDOERS-ROUTINE] 🔄 Updating existing recurring task');
          
          const task = pendingDrop.item as Task;
          const updatePayload = {
            recurring_template_id: selectedTaskForEdit.task.recurring_template_id!,
            task_template: {
              name: editableTaskName || task.name,
              description: task.description || undefined,
              points: task.points,
              duration_mins: task.estimatedMinutes,
              time_of_day: task.time_of_day || undefined,
              from_task_template_id: task.is_system ? task.id : undefined
            },
            assignments: targetMemberIds.map(memberId => ({
              member_id: memberId,
              days_of_week: targetDays,
              order_index: 0
            })),
            new_days_of_week: targetDays
          };

          console.log('[KIDOERS-ROUTINE] 📦 Recurring update payload:', updatePayload);

          // Call the recurring task update API
          const result = await bulkUpdateRecurringTasks(routineData.id, updatePayload);
          console.log('[KIDOERS-ROUTINE] ✅ Recurring task update result:', result);

          // Update UI with the changes
          // First, remove all existing tasks for this recurring template
          const newCalendarTasks = { ...calendarTasks };
          Object.keys(newCalendarTasks).forEach(day => {
            newCalendarTasks[day] = {
              ...newCalendarTasks[day],
              individualTasks: newCalendarTasks[day].individualTasks.filter(task => 
                task.recurring_template_id !== selectedTaskForEdit.task.recurring_template_id
              )
            };
          });

          // Add the updated tasks
          for (const updatedTask of result.updated_tasks) {
            const day = updatedTask.days_of_week[0]; // Each task is for one day
            if (!newCalendarTasks[day]) {
              newCalendarTasks[day] = { individualTasks: [], groups: [] };
            }
            
            // Add task to UI for each assigned member
            for (const assignment of updatedTask.assignments) {
              const taskForUI = {
                ...updatedTask,
                memberId: assignment.member_id,
                is_saved: true,
                template_id: updatedTask.recurring_template_id || undefined,
                recurring_template_id: updatedTask.recurring_template_id || undefined,
                from_group: undefined,
                estimatedMinutes: updatedTask.duration_mins || 5,
                time_of_day: updatedTask.time_of_day as "morning" | "afternoon" | "evening" | "night" | undefined
              };
              
              newCalendarTasks[day].individualTasks.push(taskForUI);
            }
          }

          setCalendarTasks(newCalendarTasks);
          console.log('[KIDOERS-ROUTINE] ✅ Updated calendar tasks for recurring task');

          // Close modal and reset state
          setShowApplyToPopup(false);
          setPendingDrop(null);
          setDaySelection({ mode: 'single', selectedDays: [] });
          setSelectedWhoOption('none');
          setEditableTaskName('');
          setSelectedTaskForEdit(null);

          return; // Exit early for recurring task updates
        }

        console.log('[KIDOERS-ROUTINE] 🚀 Using bulk API for task creation');

        // Prepare bulk task creation payload
        const task = pendingDrop.item as Task;
        
        // Check if we're extending an existing recurring task
        let existingRecurringTemplateId: string | undefined = undefined;
        if (targetDays.length > 1 && task.recurring_template_id) {
          // We're creating a multi-day task and the source task has a recurring template
          // This means we're extending an existing recurring task
          existingRecurringTemplateId = task.recurring_template_id;
          console.log('[KIDOERS-ROUTINE] 🔄 Extending existing recurring template:', existingRecurringTemplateId);
        }
        
        const bulkPayload = {
          task_template: {
            name: editableTaskName || task.name,
            description: task.description || undefined,
            points: task.points,
            duration_mins: task.estimatedMinutes,
            time_of_day: task.time_of_day || undefined,
            from_task_template_id: task.is_system ? task.id : undefined
          },
          assignments: targetMemberIds.map(memberId => ({
            member_id: memberId,
            days_of_week: targetDays,
            order_index: 0
          })),
          create_recurring_template: targetDays.length > 1, // Create recurring template for multi-day tasks
          existing_recurring_template_id: existingRecurringTemplateId // Extend existing template if available
        };

        console.log('[KIDOERS-ROUTINE] 📦 Bulk payload:', bulkPayload);

        // Call bulk API
        const result = await bulkCreateIndividualTasks(routineData.id, bulkPayload);
        console.log('[KIDOERS-ROUTINE] ✅ Bulk task creation result:', result);

        // Update UI with created tasks
        const newCalendarTasks = { ...calendarTasks };
        for (const createdTask of result.created_tasks) {
          const day = createdTask.days_of_week[0]; // Each task is created for one day
          if (!newCalendarTasks[day]) {
            newCalendarTasks[day] = { individualTasks: [], groups: [] };
          }
          
          // Add task to UI for each assigned member
          for (const memberId of targetMemberIds) {
            const taskForUI = {
              ...createdTask,
              memberId: memberId,
              is_saved: true,
              estimatedMinutes: createdTask.duration_mins || 30, // Default to 30 minutes if not specified
              time_of_day: createdTask.time_of_day as "morning" | "afternoon" | "evening" | "night" | null
            };
            
            // Check if task already exists in UI state to avoid duplicates
            const existingTaskIndex = newCalendarTasks[day].individualTasks.findIndex(
              existingTask => existingTask.id === taskForUI.id && existingTask.memberId === memberId
            );
            
            if (existingTaskIndex >= 0) {
              // Update existing task
              newCalendarTasks[day].individualTasks[existingTaskIndex] = taskForUI;
              console.log(`[KIDOERS-ROUTINE] 🔄 Updated existing task in UI: ${taskForUI.name} for ${day}`);
            } else {
              // Add new task
              newCalendarTasks[day].individualTasks.push(taskForUI);
              console.log(`[KIDOERS-ROUTINE] ➕ Added new task to UI: ${taskForUI.name} for ${day}`);
            }
          }
        }
        
        setCalendarTasks(newCalendarTasks);
        console.log('[KIDOERS-ROUTINE] ✅ UI updated with bulk created tasks');
      } else if (pendingDrop.type === 'group') {
        // Handle group creation (keep existing logic for now)
        for (const day of targetDays) {
          for (const memberId of targetMemberIds) {
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
    } catch (error) {
      console.error('[KIDOERS-ROUTINE] ❌ Error in handleApplyToSelection:', error)
      setError('Failed to create tasks. Please try again.')
    } finally {
      setIsCreatingTasks(false)
    }
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






  // Wrapper functions to handle error state
  const handleSaveRoutineDetailsWrapper = async (scheduleData: RoutineScheduleData) => {
    try {
      await handleSaveRoutineDetails(scheduleData)
      setShowRoutineDetails(false)
    } catch (err) {
      setError('Failed to save routine details. Please try again.')
    }
  }

  const handleSaveRoutineWrapper = async () => {
    setBusy(true)
    try {
      await handleSaveRoutine()
        } catch (error) {
      setError('Failed to save routine. Please try again.')
    } finally {
      setBusy(false)
    }
  }



  const totalTasks = getTotalTasks()



  // Load existing routine data using the new full-data endpoint
  const loadExistingRoutineData = async (routineId: string, enhancedMembers: any[]) => {
    setCurrentRoutineId(routineId)
    try {
      
      // Load complete routine data
      console.log('[KIDOERS-ROUTINE] 📞 ManualRoutineBuilder: Calling getRoutineFullData()');
      const fullData = await getRoutineFullData(routineId);
      console.log('[KIDOERS-ROUTINE] ✅ ManualRoutineBuilder: Full routine data loaded:', fullData);
      
      // Load recurring templates
      console.log('[KIDOERS-ROUTINE] 📋 Loading recurring templates:', fullData.recurring_templates);
      setRecurringTemplates(fullData.recurring_templates || []);
      
      // Debug: Log individual tasks data
      console.log('[KIDOERS-ROUTINE] 🔍 Individual tasks from backend:', fullData.individual_tasks.map(task => ({
        id: task.id,
        name: task.name,
        days_of_week: task.days_of_week,
        recurring_template_id: task.recurring_template_id
      })));
      
      // Debug: Check if recurring_template_id matches database
      console.log('[KIDOERS-ROUTINE] 🔍 DEBUG: Expected recurring_template_id from database: 93c6f050-b2e5-459f-b203-ead4d9303668');
      console.log('[KIDOERS-ROUTINE] 🔍 DEBUG: Actual recurring_template_ids from backend:', fullData.individual_tasks.map(t => t.recurring_template_id));
      
      // Debug: Log the specific task we're looking for
      const targetTask = fullData.individual_tasks.find(task => task.name === 'recurrent');
      if (targetTask) {
        console.log('[KIDOERS-ROUTINE] 🎯 Target task from backend:', {
          id: targetTask.id,
          name: targetTask.name,
          recurring_template_id: targetTask.recurring_template_id,
          days_of_week: targetTask.days_of_week
        });
      }
      
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
          recurring_template_id: task.recurring_template_id || undefined,
          days_of_week: task.days_of_week
        })),
        color: 'bg-blue-100 border-blue-300',
        time_of_day: group.time_of_day as "morning" | "afternoon" | "evening" | "night" | undefined,
        is_saved: true,
        template_id: undefined
      }));
      
      // Set routine groups for the modal
      setRoutineGroups(transformedGroups);
      
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
        recurring_template_id: task.recurring_template_id || undefined,
        days_of_week: task.days_of_week
      }));
      
      console.log('[KIDOERS-ROUTINE] Transformed groups:', transformedGroups);
      console.log('[KIDOERS-ROUTINE] Transformed individual tasks:', individualTasks);
      
      // Debug: Check if the target task has recurring_template_id after transformation
      const transformedTargetTask = individualTasks.find(task => task.name === 'recurrent');
      if (transformedTargetTask) {
        console.log('[KIDOERS-ROUTINE] 🎯 Target task after transformation:', {
          id: transformedTargetTask.id,
          name: transformedTargetTask.name,
          recurring_template_id: transformedTargetTask.recurring_template_id,
          days_of_week: transformedTargetTask.days_of_week
        });
      }
      
      // Load day-specific orders
      console.log('[DRAG-ORDER] 📋 ManualRoutineBuilder: Loading day-specific orders');
      loadDayOrders(fullData.day_orders || []);
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
      
      // Process individual tasks - Assign tasks to their correct members based on assignments
      console.log('[KIDOERS-ROUTINE] 🔍 Processing individual tasks for calendar population');
      console.log('[KIDOERS-ROUTINE] 🔍 selectedMemberId:', selectedMemberId);
      console.log('[KIDOERS-ROUTINE] 🔍 enhancedMembers[0]?.id:', enhancedMembers[0]?.id);
      
      for (const task of individualTasks) {
        console.log('[KIDOERS-ROUTINE] 🔍 Task:', task.name, 'days_of_week:', task.days_of_week);
        
        if (task.days_of_week) {
          // Add this task to each day it's scheduled for, for each assigned member
          for (const day of task.days_of_week) {
            if (newCalendarTasks[day]) {
              // Get assignments from the original backend data
              const backendTask = fullData.individual_tasks.find(bt => bt.id === task.id);
              if (backendTask?.assignments) {
                // Create a task instance for each assigned member
                for (const assignment of backendTask.assignments) {
                  const taskWithMemberId = {
                ...task,
                id: task.id, // Use real UUID from backend
                    memberId: assignment.member_id, // Set the correct member ID from assignment
                is_saved: true // Mark as saved
                  };
                  newCalendarTasks[day].individualTasks.push(taskWithMemberId);
                  console.log('[KIDOERS-ROUTINE] ✅ Added task to calendar:', task.name, 'on day:', day, 'for member:', assignment.member_id);
                }
              }
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
                      <FamilyMemberSelector
                        enhancedFamilyMembers={enhancedFamilyMembers}
                        selectedMemberId={selectedMemberId}
                        setSelectedMemberId={setSelectedMemberId}
                        getMemberColors={getMemberColors}
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                      />
                    
                                      </div>
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
              <CalendarGrid
                calendarTasks={calendarTasks}
                selectedMemberId={selectedMemberId}
                draggedTask={draggedTask}
                dragOverPosition={dragOverPosition}
                recurringTemplates={recurringTemplates}
                onColumnClick={handleColumnClick}
                onTaskDragStart={handleTaskDragStart}
                onTaskDragEnd={handleTaskDragEnd}
                onTaskDragOver={handleTaskDragOver}
                onTaskDragLeave={handleTaskDragLeave}
                onTaskDrop={handleTaskDrop}
                onTaskClick={handleTaskClick}
                onRemoveGroup={removeGroupFromCalendar}
                getTasksWithDayOrder={getTasksWithDayOrder}
                extractMemberIdFromId={extractMemberIdFromId}
                getTotalTasksForDay={getTotalTasksForDay}
              />
            )}

            {/* Save Button */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">

              <Button
                onClick={handleSaveRoutineWrapper}
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
                  : "Click on a day to add tasks to your routine"
                }
              </p>
            )}
          </div>
        </div>


        {/* Create New Task Modal */}
        <Dialog open={showApplyToPopup} onOpenChange={setShowApplyToPopup}>
          <DialogContent className="sm:max-w-2xl bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-800">
                {selectedTaskForEdit ? 'Edit Task' : 'Create New Task'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Task Title */}
              <div className="space-y-2">
                <Input
                  value={editableTaskName}
                  onChange={(e) => setEditableTaskName(e.target.value)}
                  placeholder="(No title)"
                  className="w-full border-0 border-b-2 border-gray-300 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none rounded-none bg-transparent px-0"
                />
              </div>
              
              {/* Date and Time */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    {pendingDrop?.targetDay ? pendingDrop.targetDay.charAt(0).toUpperCase() + pendingDrop.targetDay.slice(1) : 'Select day'}
                  </span>
                </div>
              </div>
              
              {/* Task Duration */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <Label className="text-sm font-medium text-gray-700">When should this task be done?</Label>
                </div>
                <Select
                  value={(() => {
                    const selectValue = daySelection.mode === 'single' ? 'just-this-day' : daySelection.mode === 'everyday' ? 'every-day' : 'custom-days'
                    console.log('[MODAL-SELECT] 🔍 DEBUG: daySelection.mode:', daySelection.mode, 'calculated selectValue:', selectValue)
                    return selectValue
                  })()}
                  onValueChange={(value) => {
                    console.log('[MODAL-SELECT] Day selection changed to:', value, 'Current daySelection:', daySelection)
                    if (value === 'just-this-day') {
                      setDaySelection({ mode: 'single', selectedDays: [pendingDrop?.targetDay || ''] })
                    } else if (value === 'every-day') {
                      setDaySelection({ mode: 'everyday', selectedDays: DAYS_OF_WEEK })
                    } else if (value === 'custom-days') {
                      setDaySelection({ mode: 'custom', selectedDays: [pendingDrop?.targetDay || ''] })
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="just-this-day" className="bg-white hover:bg-gray-50">Just this day</SelectItem>
                    <SelectItem value="every-day" className="bg-white hover:bg-gray-50">Every day</SelectItem>
                    <SelectItem value="custom-days" className="bg-white hover:bg-gray-50">Select specific days</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Custom Day Selection */}
                {daySelection.mode === 'custom' && (
                  <div className="ml-6 space-y-2">
                    <div className="text-xs text-gray-600 mb-2">Select days:</div>
                    <div className="grid grid-cols-7 gap-2">
                      {DAYS_OF_WEEK.map((day) => {
                        const dayIndex = DAYS_OF_WEEK.indexOf(day)
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
                            <span className="text-xs font-medium mt-1">{DAY_NAMES[dayIndex]}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Task Assignee */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <Label className="text-sm font-medium text-gray-700">Who should do this task?</Label>
                </div>
                <Select
                  value={selectedWhoOption}
                  onValueChange={setSelectedWhoOption}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="none">Only this member</SelectItem>
                    <SelectItem value="all-kids">All kids</SelectItem>
                    <SelectItem value="all-parents">All parents</SelectItem>
                    <SelectItem value="all-family">All family</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Routine Assignment */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <Label className="text-sm font-medium text-gray-700">Assign to routine (optional)</Label>
                </div>
                <div className="space-y-2">
                  <Select
                    value={selectedRoutineGroup || 'none'}
                    onValueChange={setSelectedRoutineGroup}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Choose a routine or create new" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="none">No routine assignment</SelectItem>
                      {routineGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="create-new">Create new routine</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedRoutineGroup === 'create-new' && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCreateGroupModal(true)}
                        className="flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create new routine</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <Button
                  onClick={() => handleApplyToSelection(selectedWhoOption)}
                  disabled={isCreatingTasks}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingTasks ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating...</span>
                    </div>
                  ) : (
                    'Save'
                  )}
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
          onSave={handleSaveRoutineDetailsWrapper}
          initialScheduleData={routineScheduleData || undefined}
          totalTasks={totalTasks}
          familyMembers={enhancedFamilyMembers.length}
        />

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteConfirmModal} onOpenChange={setShowDeleteConfirmModal}>
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-800">Delete recurring event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="this-event"
                    name="delete-scope"
                    value="this_day"
                    checked={deleteScope === 'this_day'}
                    onChange={(e) => setDeleteScope(e.target.value as 'this_day')}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="this-event" className="text-sm font-medium text-gray-700 cursor-pointer">
                    This event
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="this-and-following"
                    name="delete-scope"
                    value="this_and_following"
                    checked={deleteScope === 'this_and_following'}
                    onChange={(e) => setDeleteScope(e.target.value as 'this_and_following')}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="this-and-following" className="text-sm font-medium text-gray-700 cursor-pointer">
                    This and following events
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="all-events"
                    name="delete-scope"
                    value="all_days"
                    checked={deleteScope === 'all_days'}
                    onChange={(e) => setDeleteScope(e.target.value as 'all_days')}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="all-events" className="text-sm font-medium text-gray-700 cursor-pointer">
                    All events
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                onClick={() => setShowDeleteConfirmModal(false)}
                variant="outline"
                className="px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={() => performTaskDeletion(deleteScope)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
              >
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
