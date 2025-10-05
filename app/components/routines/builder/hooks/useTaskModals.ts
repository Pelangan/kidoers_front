import { useState } from 'react'
import type { Task, TaskGroup, PendingDrop, DaySelection } from '../types/routineBuilderTypes'

export const useTaskModals = () => {
  // Modal state
  const [showApplyToPopup, setShowApplyToPopup] = useState(false)
  const [showTaskMiniPopup, setShowTaskMiniPopup] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [showRoutineDetails, setShowRoutineDetails] = useState(false)
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)

  // Form state
  const [editableTaskName, setEditableTaskName] = useState('')
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<{ task: Task, day: string, memberId: string } | null>(null)
  const [miniPopupPosition, setMiniPopupPosition] = useState<{ x: number, y: number } | null>(null)
  const [deleteScope, setDeleteScope] = useState<'this_day' | 'this_and_following' | 'all_days'>('this_day')
  const [daySelection, setDaySelection] = useState<DaySelection>({ mode: 'everyday', selectedDays: [] })
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
    setDeleteScope('this_day')
  }

  const closeDeleteConfirmModal = () => {
    setShowDeleteConfirmModal(false)
    setDeleteScope('this_day')
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
    setEditableTaskName('')
    setSelectedWhoOption('none')
    setSelectedRoutineGroup('none')
    setTaskAssignmentMemberIds([])
    setDaySelection({ mode: 'everyday', selectedDays: [] })
  }

  const closeAllModals = () => {
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
    setSelectedTaskForEdit,
    setMiniPopupPosition,
    setDeleteScope,
    setDaySelection,
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
