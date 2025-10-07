/**
 * Frontend tests for cross-column drag and drop fix.
 * 
 * This test suite ensures that the drag and drop functionality
 * works correctly in the frontend and prevents regressions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTaskDragAndDrop } from '../hooks/useTaskDragAndDrop'
import type { Task, DaySpecificOrder, RecurringTemplate } from '../types/routineBuilderTypes'

// Mock the API functions
vi.mock('../../lib/api', () => ({
  bulkUpdateDayOrders: vi.fn(),
  updateTemplateDays: vi.fn()
}))

describe('useTaskDragAndDrop - Cross Column Drag Fix', () => {
  let mockUpdateCalendarTasks: jest.Mock
  let mockExtractRoutineTaskIdFromId: jest.Mock
  let mockSaveDaySpecificOrder: jest.Mock
  let mockReloadRoutineData: jest.Mock

  beforeEach(() => {
    mockUpdateCalendarTasks = vi.fn()
    mockExtractRoutineTaskIdFromId = vi.fn((id: string) => id.split('_')[0])
    mockSaveDaySpecificOrder = vi.fn()
    mockReloadRoutineData = vi.fn()

    // Reset all mocks
    vi.clearAllMocks()
  })

  const createMockTask = (id: string, name: string, day: string, routineTaskId?: string): Task => ({
    id: `${routineTaskId || id}_${day}`,
    name,
    routine_task_id: routineTaskId || id,
    recurring_template_id: 'template-123',
    memberId: 'member-123',
    points: 5,
    time_of_day: 'morning',
    frequency: 'specific_days',
    days_of_week: [day],
    member_count: 1,
    assignees: [{ id: 'member-123', name: 'Test Member' }]
  })

  const createMockCalendarTasks = () => ({
    tuesday: {
      groups: [],
      individualTasks: [
        createMockTask('task1', 'Task 1', 'tuesday', 'task1-id'),
        createMockTask('task2', 'Task 2', 'tuesday', 'task2-id'),
        createMockTask('task5', 'Task 5', 'tuesday', 'task5-id')
      ]
    },
    wednesday: {
      groups: [],
      individualTasks: [
        createMockTask('task3', 'Task 3', 'wednesday', 'task3-id'),
        createMockTask('task4', 'Task 4', 'wednesday', 'task4-id')
      ]
    }
  })

  it('should move task from Tuesday to Wednesday and create correct day order', async () => {
    const calendarTasks = createMockCalendarTasks()
    const { result } = renderHook(() =>
      useTaskDragAndDrop(
        calendarTasks,
        mockUpdateCalendarTasks,
        mockExtractRoutineTaskIdFromId,
        'routine-123',
        mockSaveDaySpecificOrder,
        [],
        mockReloadRoutineData
      )
    )

    const task5 = calendarTasks.tuesday.individualTasks[2] // Task 5
    const dragOverPosition = {
      day: 'wednesday',
      memberId: 'member-123',
      position: 'before' as const,
      targetTaskId: 'task3-id_wednesday'
    }

    // Mock the template update to return new task ID
    const { updateTemplateDays } = await import('../../lib/api')
    vi.mocked(updateTemplateDays).mockResolvedValue({
      wednesday: 'new-task5-id'
    })

    // ACT: Move Task 5 from Tuesday to Wednesday
    await act(async () => {
      await result.current.moveTaskToPosition(
        task5,
        'tuesday',
        'member-123',
        'wednesday',
        'member-123',
        dragOverPosition
      )
    })

    // ASSERT: updateCalendarTasks should be called with correct order
    expect(mockUpdateCalendarTasks).toHaveBeenCalledWith(expect.any(Function))
    
    // Check that the update function creates correct order
    const updateCall = mockUpdateCalendarTasks.mock.calls[0][0]
    const updatedTasks = updateCall({
      tuesday: calendarTasks.tuesday,
      wednesday: calendarTasks.wednesday
    })

    // Wednesday should have Task 3, Task 5, Task 4 in that order
    expect(updatedTasks.wednesday.individualTasks).toHaveLength(3)
    expect(updatedTasks.wednesday.individualTasks[0].name).toBe('Task 3')
    expect(updatedTasks.wednesday.individualTasks[1].name).toBe('Task 5')
    expect(updatedTasks.wednesday.individualTasks[2].name).toBe('Task 4')

    // Tuesday should no longer have Task 5
    expect(updatedTasks.tuesday.individualTasks).toHaveLength(2)
    expect(updatedTasks.tuesday.individualTasks.find(t => t.name === 'Task 5')).toBeUndefined()
  })

  it('should skip day order sorting during optimistic update', () => {
    const calendarTasks = createMockCalendarTasks()
    const { result } = renderHook(() =>
      useTaskDragAndDrop(
        calendarTasks,
        mockUpdateCalendarTasks,
        mockExtractRoutineTaskIdFromId,
        'routine-123',
        mockSaveDaySpecificOrder,
        [],
        mockReloadRoutineData
      )
    )

    const tasks = [
      createMockTask('task1', 'Task 1', 'wednesday', 'task1-id'),
      createMockTask('task2', 'Task 2', 'wednesday', 'task2-id')
    ]

    // Test with isOptimisticUpdate = true (should skip sorting)
    act(() => {
      result.current.setIsOptimisticUpdate(true)
    })

    const sortedTasks = result.current.getTasksWithDayOrder(tasks, 'wednesday', 'member-123')
    
    // Should return tasks as-is without sorting
    expect(sortedTasks).toEqual(tasks)
  })

  it('should apply day order sorting when not in optimistic update', () => {
    const calendarTasks = createMockCalendarTasks()
    const dayOrders: DaySpecificOrder[] = [
      {
        id: 'order1',
        routine_id: 'routine-123',
        member_id: 'member-123',
        day_of_week: 'wednesday',
        routine_task_id: 'task2-id',
        order_index: 0,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'order2',
        routine_id: 'routine-123',
        member_id: 'member-123',
        day_of_week: 'wednesday',
        routine_task_id: 'task1-id',
        order_index: 1,
        created_at: '2024-01-01T00:00:00Z'
      }
    ]

    const { result } = renderHook(() =>
      useTaskDragAndDrop(
        calendarTasks,
        mockUpdateCalendarTasks,
        mockExtractRoutineTaskIdFromId,
        'routine-123',
        mockSaveDaySpecificOrder,
        [],
        mockReloadRoutineData
      )
    )

    const tasks = [
      createMockTask('task1', 'Task 1', 'wednesday', 'task1-id'),
      createMockTask('task2', 'Task 2', 'wednesday', 'task2-id')
    ]

    // Load day orders
    act(() => {
      result.current.loadDayOrders(dayOrders)
    })

    // Test with isOptimisticUpdate = false (should apply sorting)
    act(() => {
      result.current.setIsOptimisticUpdate(false)
    })

    const sortedTasks = result.current.getTasksWithDayOrder(tasks, 'wednesday', 'member-123')
    
    // Should be sorted by day order (Task 2 first, then Task 1)
    expect(sortedTasks[0].name).toBe('Task 2')
    expect(sortedTasks[1].name).toBe('Task 1')
  })

  it('should clear drag state immediately after optimistic update', async () => {
    const calendarTasks = createMockCalendarTasks()
    const { result } = renderHook(() =>
      useTaskDragAndDrop(
        calendarTasks,
        mockUpdateCalendarTasks,
        mockExtractRoutineTaskIdFromId,
        'routine-123',
        mockSaveDaySpecificOrder,
        [],
        mockReloadRoutineData
      )
    )

    const task5 = calendarTasks.tuesday.individualTasks[2]
    const dragOverPosition = {
      day: 'wednesday',
      memberId: 'member-123',
      position: 'before' as const,
      targetTaskId: 'task3-id_wednesday'
    }

    // Mock the template update
    const { updateTemplateDays } = await import('../../lib/api')
    vi.mocked(updateTemplateDays).mockResolvedValue({
      wednesday: 'new-task5-id'
    })

    // Set initial drag state
    act(() => {
      result.current.setDraggedTask({ task: task5, day: 'tuesday', memberId: 'member-123' })
      result.current.setDragOverPosition(dragOverPosition)
      result.current.setIsDragging(true)
    })

    // ACT: Move task
    await act(async () => {
      await result.current.moveTaskToPosition(
        task5,
        'tuesday',
        'member-123',
        'wednesday',
        'member-123',
        dragOverPosition
      )
    })

    // ASSERT: Drag state should be cleared
    expect(result.current.draggedTask).toBeNull()
    expect(result.current.dragOverPosition).toBeNull()
    expect(result.current.isDragging).toBe(false)
  })

  it('should handle drag and drop events correctly', () => {
    const calendarTasks = createMockCalendarTasks()
    const { result } = renderHook(() =>
      useTaskDragAndDrop(
        calendarTasks,
        mockUpdateCalendarTasks,
        mockExtractRoutineTaskIdFromId,
        'routine-123',
        mockSaveDaySpecificOrder,
        [],
        mockReloadRoutineData
      )
    )

    const task5 = calendarTasks.tuesday.individualTasks[2]
    const mockEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        effectAllowed: '',
        setData: vi.fn()
      }
    } as any

    // ACT: Start drag
    act(() => {
      result.current.handleTaskDragStart(mockEvent, task5, 'tuesday', 'member-123')
    })

    // ASSERT: Drag state should be set
    expect(result.current.draggedTask).toEqual({ task: task5, day: 'tuesday', memberId: 'member-123' })
    expect(result.current.isDragging).toBe(true)

    // ACT: Drag over
    act(() => {
      result.current.handleTaskDragOver(mockEvent, 'wednesday', 'member-123', 'before', 'task3-id_wednesday')
    })

    // ASSERT: Drag over position should be set
    expect(result.current.dragOverPosition).toEqual({
      day: 'wednesday',
      memberId: 'member-123',
      position: 'before',
      targetTaskId: 'task3-id_wednesday'
    })

    // ACT: End drag
    act(() => {
      result.current.handleTaskDragEnd()
    })

    // ASSERT: Drag state should be cleared
    expect(result.current.draggedTask).toBeNull()
    expect(result.current.dragOverPosition).toBeNull()
    expect(result.current.isDragging).toBe(false)
  })
})
