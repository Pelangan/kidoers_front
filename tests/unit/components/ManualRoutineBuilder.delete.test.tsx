/**
 * Integration tests for ManualRoutineBuilder - Delete Modal Behavior
 * 
 * Testing the delete modal logic:
 * - Should show modal only for tasks with same recurring_template_id on multiple days
 * - Should delete immediately for tasks with different recurring_template_id (even with same name)
 * - Should delete immediately for standalone tasks
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManualRoutineBuilder from '@/app/components/routines/builder/ManualRoutineBuilder';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}));

// Mock API module
jest.mock('@/app/lib/api', () => ({
  apiService: {
    getFamilyMembers: jest.fn(),
    makeRequest: jest.fn(),
  },
  getRoutineFullData: jest.fn(),
  getOnboardingRoutine: jest.fn(),
}));

// Mock storage
jest.mock('@/app/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Import API after mocking
import { apiService, getRoutineFullData, getOnboardingRoutine } from '@/app/lib/api';

describe('ManualRoutineBuilder - Delete Modal Behavior', () => {
  const mockFamilyId = 'test-family-123';
  const mockOnComplete = jest.fn();

  // Mock family data
  const mockFamilyMembers = [
    { id: 'member-1', name: 'Cristian', role: 'parent', color: 'blue', avatar_url: null },
    { id: 'member-2', name: 'Cristina', role: 'parent', color: 'yellow', avatar_url: null },
    { id: 'member-3', name: 'Guille', role: 'child', color: 'green', avatar_url: null },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API mocks
    (apiService.getFamilyMembers as jest.Mock).mockResolvedValue(mockFamilyMembers);
    (apiService.makeRequest as jest.Mock).mockResolvedValue({ data: [] });
    (getOnboardingRoutine as jest.Mock).mockResolvedValue(null);
    (getRoutineFullData as jest.Mock).mockResolvedValue({
      individual_tasks: [],
      groups: [],
      recurring_templates: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Delete modal for recurring tasks', () => {
    it('should show delete modal for tasks with same recurring_template_id on multiple days', async () => {
      // Mock tasks with same recurring_template_id on different days
      const mockTasks = [
        {
          id: 'task-1',
          name: 'Brush Teeth',
          recurring_template_id: 'template-1',
          days_of_week: ['monday'],
          memberId: 'member-1',
        },
        {
          id: 'task-2',
          name: 'Brush Teeth',
          recurring_template_id: 'template-1', // Same template ID
          days_of_week: ['tuesday'],
          memberId: 'member-1',
        },
      ];

      // Mock getRoutineFullData to return tasks with proper structure
      (getRoutineFullData as jest.Mock).mockResolvedValue({
        individual_tasks: mockTasks.map(task => ({
          id: task.id,
          name: task.name,
          recurring_template_id: task.recurring_template_id,
          days_of_week: task.days_of_week,
          member_id: task.memberId,
          assignees: [],
          assignments: [{
            member_id: 'member-1',
            routine_task_id: task.id,
          }], // Add proper assignments structure
          points: 5,
          time_of_day: 'morning',
          is_active: true,
        })),
        groups: [],
        recurring_templates: [],
      });

      render(<ManualRoutineBuilder familyId={mockFamilyId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getAllByText('Brush Teeth')).toHaveLength(2);
      });

      // Find and click delete button for one of the tasks
      const deleteButtons = screen.getAllByLabelText(/delete/i);
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        // Should show delete confirmation modal
        expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
        expect(screen.getByText(/This will delete the task from all days/i)).toBeInTheDocument();
      });
    });

    it('should not show delete modal for tasks with different recurring_template_id', async () => {
      // Mock tasks with different recurring_template_id but same name
      const mockTasks = [
        {
          id: 'task-1',
          name: 'Brush Teeth',
          recurring_template_id: 'template-1',
          days_of_week: ['monday'],
          memberId: 'member-1',
        },
        {
          id: 'task-2',
          name: 'Brush Teeth',
          recurring_template_id: 'template-2', // Different template ID
          days_of_week: ['tuesday'],
          memberId: 'member-1',
        },
      ];

      // Mock getRoutineFullData to return tasks with proper structure
      (getRoutineFullData as jest.Mock).mockResolvedValue({
        individual_tasks: mockTasks.map(task => ({
          id: task.id,
          name: task.name,
          recurring_template_id: task.recurring_template_id,
          days_of_week: task.days_of_week,
          member_id: task.memberId,
          assignees: [],
          assignments: [{
            member_id: 'member-1',
            routine_task_id: task.id,
          }], // Add proper assignments structure
          points: 5,
          time_of_day: 'morning',
          is_active: true,
        })),
        groups: [],
        recurring_templates: [],
      });

      render(<ManualRoutineBuilder familyId={mockFamilyId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getAllByText('Brush Teeth')).toHaveLength(2);
      });

      // Find and click delete button for one of the tasks
      const deleteButtons = screen.getAllByLabelText(/delete/i);
      await userEvent.click(deleteButtons[0]);

      await waitFor(() => {
        // Should NOT show delete confirmation modal
        expect(screen.queryByText(/Are you sure you want to delete/i)).not.toBeInTheDocument();
        // Task should be deleted immediately
        expect(screen.queryByText('Brush Teeth')).not.toBeInTheDocument();
      });
    });

    it('should not show delete modal for standalone tasks', async () => {
      // Mock standalone task (only appears on one day)
      const mockTasks = [
        {
          id: 'task-1',
          name: 'Standalone Task',
          recurring_template_id: 'template-1',
          days_of_week: ['monday'],
          memberId: 'member-1',
        },
      ];

      // Mock getRoutineFullData to return tasks with proper structure
      (getRoutineFullData as jest.Mock).mockResolvedValue({
        individual_tasks: mockTasks.map(task => ({
          id: task.id,
          name: task.name,
          recurring_template_id: task.recurring_template_id,
          days_of_week: task.days_of_week,
          member_id: task.memberId,
          assignees: [],
          assignments: [{
            member_id: 'member-1',
            routine_task_id: task.id,
          }], // Add proper assignments structure
          points: 5,
          time_of_day: 'morning',
          is_active: true,
        })),
        groups: [],
        recurring_templates: [],
      });

      render(<ManualRoutineBuilder familyId={mockFamilyId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText('Standalone Task')).toBeInTheDocument();
      });

      // Find and click delete button
      const deleteButton = screen.getByLabelText(/delete/i);
      await userEvent.click(deleteButton);

      await waitFor(() => {
        // Should NOT show delete confirmation modal
        expect(screen.queryByText(/Are you sure you want to delete/i)).not.toBeInTheDocument();
        // Task should be deleted immediately
        expect(screen.queryByText('Standalone Task')).not.toBeInTheDocument();
      });
    });
  });

  describe('Delete confirmation modal actions', () => {
    it('should delete task from all days when confirmed', async () => {
      const user = userEvent.setup();
      
      // Mock tasks with same recurring_template_id
      const mockTasks = [
        {
          id: 'task-1',
          name: 'Recurring Task',
          recurring_template_id: 'template-1',
          days_of_week: ['monday'],
          memberId: 'member-1',
        },
        {
          id: 'task-2',
          name: 'Recurring Task',
          recurring_template_id: 'template-1',
          days_of_week: ['tuesday'],
          memberId: 'member-1',
        },
      ];

      // Mock getRoutineFullData to return tasks with proper structure
      (getRoutineFullData as jest.Mock).mockResolvedValue({
        individual_tasks: mockTasks.map(task => ({
          id: task.id,
          name: task.name,
          recurring_template_id: task.recurring_template_id,
          days_of_week: task.days_of_week,
          member_id: task.memberId,
          assignees: [],
          assignments: [{
            member_id: 'member-1',
            routine_task_id: task.id,
          }], // Add proper assignments structure
          points: 5,
          time_of_day: 'morning',
          is_active: true,
        })),
        groups: [],
        recurring_templates: [],
      });

      render(<ManualRoutineBuilder familyId={mockFamilyId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getAllByText('Recurring Task')).toHaveLength(2);
      });

      // Click delete button
      const deleteButtons = screen.getAllByLabelText(/delete/i);
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
      });

      // Click confirm button
      const confirmButton = screen.getByText(/Delete from all days/i);
      await user.click(confirmButton);

      await waitFor(() => {
        // Task should be deleted from all days
        expect(screen.queryByText('Recurring Task')).not.toBeInTheDocument();
      });
    });

    it('should cancel deletion when cancel button is clicked', async () => {
      const user = userEvent.setup();
      
      // Mock tasks with same recurring_template_id
      const mockTasks = [
        {
          id: 'task-1',
          name: 'Recurring Task',
          recurring_template_id: 'template-1',
          days_of_week: ['monday'],
          memberId: 'member-1',
        },
        {
          id: 'task-2',
          name: 'Recurring Task',
          recurring_template_id: 'template-1',
          days_of_week: ['tuesday'],
          memberId: 'member-1',
        },
      ];

      // Mock getRoutineFullData to return tasks with proper structure
      (getRoutineFullData as jest.Mock).mockResolvedValue({
        individual_tasks: mockTasks.map(task => ({
          id: task.id,
          name: task.name,
          recurring_template_id: task.recurring_template_id,
          days_of_week: task.days_of_week,
          member_id: task.memberId,
          assignees: [],
          assignments: [{
            member_id: 'member-1',
            routine_task_id: task.id,
          }], // Add proper assignments structure
          points: 5,
          time_of_day: 'morning',
          is_active: true,
        })),
        groups: [],
        recurring_templates: [],
      });

      render(<ManualRoutineBuilder familyId={mockFamilyId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getAllByText('Recurring Task')).toHaveLength(2);
      });

      // Click delete button
      const deleteButtons = screen.getAllByLabelText(/delete/i);
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByText(/Cancel/i);
      await user.click(cancelButton);

      await waitFor(() => {
        // Modal should be closed
        expect(screen.queryByText(/Are you sure you want to delete/i)).not.toBeInTheDocument();
        // Task should still be visible
        expect(screen.getByText('Recurring Task')).toBeInTheDocument();
      });
    });
  });
});
