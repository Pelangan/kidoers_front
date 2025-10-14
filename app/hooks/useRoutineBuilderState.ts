import { useState, useCallback } from 'react';
import type { FamilyMember, CalendarTask, RoutineGroup } from '@/app/types';

interface UseRoutineBuilderStateProps {
  familyId: string;
}

export const useRoutineBuilderState = ({ familyId }: UseRoutineBuilderStateProps) => {
  // Core routine state
  const [routine, setRoutine] = useState<any>(null);
  const [routineName, setRoutineName] = useState('');
  const [isCreatingRoutine, setIsCreatingRoutine] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [routineScheduleData, setRoutineScheduleData] = useState<any>(null);
  const [currentRoutineId, setCurrentRoutineId] = useState<string | null>(null);
  const [recurringTemplates, setRecurringTemplates] = useState<any[]>([]);

  // Family and member state
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [enhancedFamilyMembers, setEnhancedFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Calendar and task state
  const [calendarTasks, setCalendarTasks] = useState<CalendarTask>({
    sunday: { individualTasks: [], groups: [] },
    monday: { individualTasks: [], groups: [] },
    tuesday: { individualTasks: [], groups: [] },
    wednesday: { individualTasks: [], groups: [] },
    thursday: { individualTasks: [], groups: [] },
    friday: { individualTasks: [], groups: [] },
    saturday: { individualTasks: [], groups: [] },
  });

  // Routine groups state
  const [routineGroups, setRoutineGroups] = useState<RoutineGroup[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Modal state
  const [showApplyToPopup, setShowApplyToPopup] = useState(false);
  const [showTaskMiniPopup, setShowTaskMiniPopup] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showRoutineDetails, setShowRoutineDetails] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

  // Task editing state
  const [editableTaskName, setEditableTaskName] = useState('');
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<any>(null);
  const [miniPopupPosition, setMiniPopupPosition] = useState<{ x: number; y: number } | null>(null);

  // Delete confirmation state
  const [deleteScope, setDeleteScope] = useState<'single' | 'all'>('single');
  const [daySelection, setDaySelection] = useState<string[]>([]);
  const [selectedWhoOption, setSelectedWhoOption] = useState<string>('');
  const [selectedRoutineGroup, setSelectedRoutineGroup] = useState<any>(null);
  const [taskAssignmentMemberIds, setTaskAssignmentMemberIds] = useState<string[]>([]);

  // Loading and error state
  const [isCreatingTasks, setIsCreatingTasks] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState<any>(null);
  const [dragOverPosition, setDragOverPosition] = useState<any>(null);
  const [dayOrders, setDayOrders] = useState<any>({});
  const [isDragging, setIsDragging] = useState(false);

  // Pending operations
  const [pendingDrop, setPendingDrop] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  // Modal control functions
  const openTaskModal = useCallback(() => {
    setShowApplyToPopup(true);
  }, []);

  const closeTaskModal = useCallback(() => {
    setShowApplyToPopup(false);
  }, []);

  const openTaskMiniPopup = useCallback(() => {
    setShowTaskMiniPopup(true);
  }, []);

  const closeTaskMiniPopup = useCallback(() => {
    setShowTaskMiniPopup(false);
  }, []);

  const openDeleteConfirmModal = useCallback(() => {
    setShowDeleteConfirmModal(true);
  }, []);

  const closeDeleteConfirmModal = useCallback(() => {
    setShowDeleteConfirmModal(false);
  }, []);

  const openRoutineDetailsModal = useCallback(() => {
    setShowRoutineDetails(true);
  }, []);

  const closeRoutineDetailsModal = useCallback(() => {
    setShowRoutineDetails(false);
  }, []);

  const openCreateGroupModal = useCallback(() => {
    setShowCreateGroupModal(true);
  }, []);

  const closeCreateGroupModal = useCallback(() => {
    setShowCreateGroupModal(false);
  }, []);

  const resetFormState = useCallback(() => {
    setEditableTaskName('');
    setSelectedTaskForEdit(null);
    setMiniPopupPosition(null);
    setDeleteScope('single');
    setDaySelection([]);
    setSelectedWhoOption('');
    setSelectedRoutineGroup(null);
    setTaskAssignmentMemberIds([]);
    setPendingDrop(null);
  }, []);

  const closeAllModals = useCallback(() => {
    setShowApplyToPopup(false);
    setShowTaskMiniPopup(false);
    setShowDeleteConfirmModal(false);
    setShowRoutineDetails(false);
    setShowCreateGroupModal(false);
    resetFormState();
  }, [resetFormState]);

  return {
    // Core routine state
    routine,
    setRoutine,
    routineName,
    setRoutineName,
    isCreatingRoutine,
    setIsCreatingRoutine,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    routineScheduleData,
    setRoutineScheduleData,
    currentRoutineId,
    setCurrentRoutineId,
    recurringTemplates,
    setRecurringTemplates,

    // Family and member state
    familyMembers,
    setFamilyMembers,
    enhancedFamilyMembers,
    setEnhancedFamilyMembers,
    selectedMemberIds,
    setSelectedMemberIds,

    // Calendar and task state
    calendarTasks,
    setCalendarTasks,
    routineGroups,
    setRoutineGroups,
    viewMode,
    setViewMode,

    // Modal state
    showApplyToPopup,
    setShowApplyToPopup,
    showTaskMiniPopup,
    setShowTaskMiniPopup,
    showDeleteConfirmModal,
    setShowDeleteConfirmModal,
    showRoutineDetails,
    setShowRoutineDetails,
    showCreateGroupModal,
    setShowCreateGroupModal,

    // Task editing state
    editableTaskName,
    setEditableTaskName,
    selectedTaskForEdit,
    setSelectedTaskForEdit,
    miniPopupPosition,
    setMiniPopupPosition,

    // Delete confirmation state
    deleteScope,
    setDeleteScope,
    daySelection,
    setDaySelection,
    selectedWhoOption,
    setSelectedWhoOption,
    selectedRoutineGroup,
    setSelectedRoutineGroup,
    taskAssignmentMemberIds,
    setTaskAssignmentMemberIds,

    // Loading and error state
    isCreatingTasks,
    setIsCreatingTasks,
    isDeletingTask,
    setIsDeletingTask,
    isLoadingData,
    setIsLoadingData,
    error,
    setError,

    // Drag and drop state
    draggedTask,
    setDraggedTask,
    dragOverPosition,
    setDragOverPosition,
    dayOrders,
    setDayOrders,
    isDragging,
    setIsDragging,

    // Pending operations
    pendingDrop,
    setPendingDrop,
    busy,
    setBusy,

    // Modal control functions
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
    closeAllModals,
  };
};
