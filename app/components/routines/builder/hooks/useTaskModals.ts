import { useState } from 'react'
import type { Task, TaskGroup, PendingDrop, DaySelection } from '../types/routineBuilderTypes'
import type { DeleteScope } from './useTaskOperations'

export const useTaskModals = () => {
  // Modal state
  const [showApplyToPopup, setShowApplyToPopup] = useState(false)
  const [showTaskMiniPopup, setShowTaskMiniPopup] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [showRoutineDetails, setShowRoutineDetails] = useState(false)
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)

  // Form state
  const [editableTaskName, setEditableTaskName] = useState('')
  const [editablePoints, setEditablePoints] = useState<number>(5)
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<{ task: Task, day: string, memberId: string } | null>(null)
  const [miniPopupPosition, setMiniPopupPosition] = useState<{ x: number, y: number } | null>(null)
  const [deleteScope, setDeleteScope] = useState<DeleteScope>('instance')
  const [daySelection, setDaySelection] = useState<DaySelection>({ mode: 'everyday', selectedDays: [] })

  // Debug wrapper for setDaySelection
  const debugSetDaySelection = (newValue: DaySelection | ((prev: DaySelection) => DaySelection)) => {
    console.log('[USE-TASK-MODALS] 🔍 DEBUG: setDaySelection called with:', newValue);
    if (typeof newValue === 'function') {
      setDaySelection((prev) => {
        const result = newValue(prev);
        console.log('[USE-TASK-MODALS] 🔍 DEBUG: setDaySelection function result:', result);
        return result;
      });
    } else {
      console.log('[USE-TASK-MODALS] 🔍 DEBUG: setDaySelection direct value:', newValue);
      setDaySelection(newValue);
    }
  }
  const [selectedWhoOption, setSelectedWhoOption] = useState<string>('none')
  const [selectedRoutineGroup, setSelectedRoutineGroup] = useState<string>('none')
  const [taskAssignmentMemberIds, setTaskAssignmentMemberIds] = useState<string[]>([])

  // Loading states
  const [isCreatingTasks, setIsCreatingTasks] = useState(false)
  const [isDeletingTask, setIsDeletingTask] = useState(false)

  // Modal control functions
  const openTaskModal = (task: Task, day: string, memberId: string) => {
    setSelectedTaskForEdit({ task, day, memberId })
    setEditableTaskName(task.name)
    setEditablePoints(task.points || 5)
    setShowApplyToPopup(true)
    setSelectedWhoOption('none')
  }

  const closeTaskModal = () => {
    setShowApplyToPopup(false)
    setSelectedTaskForEdit(null)
    setEditableTaskName('')
    setSelectedWhoOption('none')
  }

  const openTaskMiniPopup = (task: Task, day: string, memberId: string, position: { x: number, y: number }) => {
    setSelectedTaskForEdit({ task, day, memberId })
    setMiniPopupPosition(position)
    setShowTaskMiniPopup(true)
  }

  const closeTaskMiniPopup = () => {
    setShowTaskMiniPopup(false)
    setSelectedTaskForEdit(null)
    setMiniPopupPosition(null)
  }

  const openDeleteConfirmModal = () => {
    setShowDeleteConfirmModal(true)
    setDeleteScope('instance')
  }

  const closeDeleteConfirmModal = () => {
    setShowDeleteConfirmModal(false)
    setDeleteScope('instance')
  }

  const openRoutineDetailsModal = () => {
    setShowRoutineDetails(true)
  }

  const closeRoutineDetailsModal = () => {
    setShowRoutineDetails(false)
  }

  const openCreateGroupModal = () => {
    setShowCreateGroupModal(true)
  }

  const closeCreateGroupModal = () => {
    setShowCreateGroupModal(false)
  }

  const resetFormState = () => {
    console.log('[USE-TASK-MODALS] 🔍 DEBUG: resetFormState called - resetting daySelection to everyday');
    setEditableTaskName('')
    setEditablePoints(5)
    setSelectedWhoOption('none')
    setSelectedRoutineGroup('none')
    setTaskAssignmentMemberIds([])
    setDaySelection({ mode: 'everyday', selectedDays: [] })
  }

  const closeAllModals = () => {
    console.log('[USE-TASK-MODALS] 🔍 DEBUG: closeAllModals called - will call resetFormState');
    setShowApplyToPopup(false)
    setShowTaskMiniPopup(false)
    setShowDeleteConfirmModal(false)
    setShowRoutineDetails(false)
    setShowCreateGroupModal(false)
    setSelectedTaskForEdit(null)
    setMiniPopupPosition(null)
    resetFormState()
  }

  return {
    // Modal state
    showApplyToPopup,
    showTaskMiniPopup,
    showDeleteConfirmModal,
    showRoutineDetails,
    showCreateGroupModal,
    
    // Form state
    editableTaskName,
    editablePoints,
    selectedTaskForEdit,
    miniPopupPosition,
    deleteScope,
    daySelection,
    selectedWhoOption,
    selectedRoutineGroup,
    taskAssignmentMemberIds,
    
    // Loading states
    isCreatingTasks,
    isDeletingTask,
    
    // Setters
    setShowApplyToPopup,
    setShowTaskMiniPopup,
    setShowDeleteConfirmModal,
    setShowRoutineDetails,
    setShowCreateGroupModal,
    setEditableTaskName,
    setEditablePoints,
    setSelectedTaskForEdit,
    setMiniPopupPosition,
    setDeleteScope,
    setDaySelection: debugSetDaySelection,
    setSelectedWhoOption,
    setSelectedRoutineGroup,
    setTaskAssignmentMemberIds,
    setIsCreatingTasks,
    setIsDeletingTask,
    
    // Control functions
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
  }
}
