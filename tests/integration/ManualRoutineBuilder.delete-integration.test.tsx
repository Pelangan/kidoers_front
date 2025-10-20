/**
 * Integration tests for ManualRoutineBuilder - Delete Modal Integration
 * 
 * These tests simulate real user interactions to verify the delete modal behavior:
 * - Clicking delete on tasks with same recurring_template_id should show modal
 * - Clicking delete on tasks with different recurring_template_id should delete immediately
 * - Modal should provide correct deletion options
 */

import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
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
    getOnboardingStatus: jest.fn(),
  },
  getRoutineFullData: jest.fn(),
  getOnboardingRoutine: jest.fn(),
  createRoutineDraft: jest.fn(),
  updateOnboardingStep: jest.fn(),
  deleteRoutineTask: jest.fn(),
  bulkDeleteTasks: jest.fn(),
}));

// Mock storage
jest.mock('@/app/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Import API after mocking
import { apiService, getRoutineFullData, getOnboardingRoutine, createRoutineDraft, updateOnboardingStep, deleteRoutineTask, bulkDeleteTasks } from '@/app/lib/api';

describe('ManualRoutineBuilder - Delete Modal Integration', () => {
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
    // Mock existing routine so component doesn't need to create one
    (apiService.makeRequest as jest.Mock).mockImplementation((url) => {
      if (url.includes('/routines?family_id=')) {
        return Promise.resolve([{
          id: 'test-routine-123',
          family_id: mockFamilyId,
          name: 'My Routine',
          status: 'active'
        }]);
      }
      return Promise.resolve({ data: [] });
    });
    (apiService.getOnboardingStatus as jest.Mock).mockResolvedValue({
      has_family: true,
      in_progress: { setup_step: 'create_routine' }
    });
    (getOnboardingRoutine as jest.Mock).mockResolvedValue(null);
    (updateOnboardingStep as jest.Mock).mockResolvedValue({});
    (createRoutineDraft as jest.Mock).mockResolvedValue({
      id: 'test-routine-123',
      family_id: mockFamilyId,
      name: 'My Routine',
      status: 'draft'
    });
    (deleteRoutineTask as jest.Mock).mockImplementation(async (taskId) => {
      // Simulate actual deletion by updating the mock data
      const currentMock = (getRoutineFullData as jest.Mock).mock.results[0]?.value;
      if (currentMock && currentMock.individual_tasks) {
        // Remove deleted task from the mock data
        const updatedTasks = currentMock.individual_tasks.filter((task: any) => 
          task.id !== taskId
        );
        
        // Update the mock to return the filtered tasks
        (getRoutineFullData as jest.Mock).mockResolvedValue({
          ...currentMock,
          individual_tasks: updatedTasks
        });
      }
      
      return { success: true };
    });
    (bulkDeleteTasks as jest.Mock).mockImplementation(async (taskIds, options) => {
      // Simulate actual deletion by updating the mock data
      const currentMock = (getRoutineFullData as jest.Mock).mock.results[0]?.value;
      if (currentMock && currentMock.individual_tasks) {
        // Remove deleted tasks from the mock data
        const updatedTasks = currentMock.individual_tasks.filter((task: any) => 
          !taskIds.includes(task.id)
        );
        
        // Update the mock to return the filtered tasks
        (getRoutineFullData as jest.Mock).mockResolvedValue({
          ...currentMock,
          individual_tasks: updatedTasks
        });
      }
      
      return {
        routine_id: 'test-routine-123',
        tasks_deleted: taskIds.length,
        assignments_deleted: taskIds.length,
        days_affected: ['monday'],
        message: 'Tasks deleted successfully',
        cleaned_templates: []
      };
    });
    (getRoutineFullData as jest.Mock).mockResolvedValue({
      individual_tasks: [],
      groups: [],
      recurring_templates: [],
    });
  });

  afterEach(() => {
    // Don't clear mocks - they're needed for the next test
  });

  describe('Delete modal for recurring tasks with same template ID', () => {
    it('should show delete modal when deleting task with same recurring_template_id on multiple days', async () => {
      const user = userEvent.setup();
      
      // Mock tasks with same recurring_template_id on different days
      const mockTasks = [
        {
          id: 'task-1',
          name: 'Brush Teeth',
          recurring_template_id: 'template-1',
          days_of_week: ['monday'],
          memberId: 'member-1',
          assignees: [{ id: 'member-1', name: 'Cristian' }],
          member_count: 1,
        },
        {
          id: 'task-2',
          name: 'Brush Teeth',
          recurring_template_id: 'template-1', // Same template ID
          days_of_week: ['tuesday'],
          memberId: 'member-1',
          assignees: [{ id: 'member-1', name: 'Cristian' }],
          member_count: 1,
        },
        {
          id: 'task-3',
          name: 'Brush Teeth',
          recurring_template_id: 'template-1', // Same template ID
          days_of_week: ['wednesday'],
          memberId: 'member-1',
          assignees: [{ id: 'member-1', name: 'Cristian' }],
          member_count: 1,
        },
      ];

      // Mock getRoutineFullData to return tasks with proper structure
      (getRoutineFullData as jest.Mock).mockResolvedValue({
        individual_tasks: mockTasks.map(task => ({
          id: task.id,
          name: task.name,
          recurring_template_id: task.recurring_template_id,
          days_of_week: ['monday', 'tuesday'], // Make tasks truly recurring with multiple days
          member_id: task.memberId,
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
        expect(screen.getAllByText('Brush Teeth')).toHaveLength(3);
      });

      // Click on a task to open the mini popup, then click delete button
      const taskElements = screen.getAllByText('Brush Teeth');
      await user.click(taskElements[0]); // Click first task to open popup
      
      await waitFor(() => {
        const deleteButton = screen.getByTestId('delete-task-button');
        expect(deleteButton).toBeInTheDocument();
      });
      
      const deleteButton = screen.getByTestId('delete-task-button');
      await user.click(deleteButton);

      await waitFor(() => {
        // Should show delete confirmation modal
        expect(screen.getByText('Delete recurring event')).toBeInTheDocument();
        expect(screen.getByText(/This will delete the task from all days/i)).toBeInTheDocument();
        
        // Should show options for deleting from all days or just current day
        expect(screen.getByText(/Delete from all days/i)).toBeInTheDocument();
        expect(screen.getByText(/Delete only from Monday/i)).toBeInTheDocument();
      });
    });

    it('should delete task from all days when "Delete from all days" is clicked', async () => {
      const user = userEvent.setup();
      
      const mockTasks = [
        {
          id: 'task-1',
          name: 'Recurring Task',
          recurring_template_id: 'template-1',
          days_of_week: ['monday'],
          memberId: 'member-1',
          assignees: [{ id: 'member-1', name: 'Cristian' }],
          member_count: 1,
        },
        {
          id: 'task-2',
          name: 'Recurring Task',
          recurring_template_id: 'template-1',
          days_of_week: ['tuesday'],
          memberId: 'member-1',
          assignees: [{ id: 'member-1', name: 'Cristian' }],
          member_count: 1,
        },
      ];

      // Mock getRoutineFullData to return tasks with proper structure
      (getRoutineFullData as jest.Mock).mockResolvedValue({
        individual_tasks: mockTasks.map(task => ({
          id: task.id,
          name: task.name,
          recurring_template_id: task.recurring_template_id,
          days_of_week: ['monday', 'tuesday'], // Make tasks truly recurring with multiple days
          member_id: task.memberId,
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
        expect(screen.getAllByText('Recurring Task')).toHaveLength(4); // 2 tasks × 2 days = 4 total
      });

      // Click on a task to open the mini popup, then click delete button
      const taskElements = screen.getAllByText('Recurring Task');
      await user.click(taskElements[0]); // Click first task to open popup
      
      await waitFor(() => {
        const deleteButton = screen.getByTestId('delete-task-button');
        expect(deleteButton).toBeInTheDocument();
      });
      
      const deleteButton = screen.getByTestId('delete-task-button');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete recurring event')).toBeInTheDocument();
      });

      // Click "All events" radio button and then "OK"
      const allEventsRadio = screen.getByLabelText('All events');
      await user.click(allEventsRadio);
      
      const okButton = screen.getByTestId('confirm-delete-button');
      await user.click(okButton);

        await waitFor(() => {
          // Task should be deleted from all days
          expect(screen.getAllByText('Recurring Task')).toHaveLength(0);
        });
    });

    it('should delete task only from current day when "Delete only from [day]" is clicked', async () => {
      const user = userEvent.setup();
      
      const mockTasks = [
        {
          id: 'task-1',
          name: 'Recurring Task',
          recurring_template_id: 'template-1',
          days_of_week: ['monday'],
          memberId: 'member-1',
          assignees: [{ id: 'member-1', name: 'Cristian' }],
          member_count: 1,
        },
        {
          id: 'task-2',
          name: 'Recurring Task',
          recurring_template_id: 'template-1',
          days_of_week: ['tuesday'],
          memberId: 'member-1',
          assignees: [{ id: 'member-1', name: 'Cristian' }],
          member_count: 1,
        },
      ];

      // Mock getRoutineFullData to return tasks with proper structure
      (getRoutineFullData as jest.Mock).mockResolvedValue({
        individual_tasks: mockTasks.map(task => ({
          id: task.id,
          name: task.name,
          recurring_template_id: task.recurring_template_id,
          days_of_week: ['monday', 'tuesday'], // Make tasks truly recurring with multiple days
          member_id: task.memberId,
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
        expect(screen.getAllByText('Recurring Task')).toHaveLength(4); // 2 tasks × 2 days = 4 total
      });

      // Click on a task to open the mini popup, then click delete button
      const taskElements = screen.getAllByText('Recurring Task');
      await user.click(taskElements[0]); // Click first task to open popup
      
      await waitFor(() => {
        const deleteButton = screen.getByTestId('delete-task-button');
        expect(deleteButton).toBeInTheDocument();
      });
      
      const deleteButton = screen.getByTestId('delete-task-button');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete recurring event')).toBeInTheDocument();
      });

      // Click "This event only" radio button and then "OK"
      const thisEventOnlyRadio = screen.getByLabelText('This event only');
      await user.click(thisEventOnlyRadio);
      
      const okButton = screen.getByTestId('confirm-delete-button');
      await user.click(okButton);

        await waitFor(() => {
          // Task should be deleted from Monday but still visible on Tuesday
          expect(screen.getAllByText('Recurring Task')).toHaveLength(2);
        });
    });
  });

  describe('Immediate deletion for non-recurring tasks', () => {
    it('should delete immediately when tasks have different recurring_template_id', async () => {
      const user = userEvent.setup();
      
      const mockTasks = [
        {
          id: 'task-1',
          name: 'Brush Teeth',
          recurring_template_id: 'template-1',
          days_of_week: ['monday'],
          memberId: 'member-1',
          assignees: [{ id: 'member-1', name: 'Cristian' }],
          member_count: 1,
        },
        {
          id: 'task-2',
          name: 'Brush Teeth',
          recurring_template_id: 'template-2', // Different template ID
          days_of_week: ['tuesday'],
          memberId: 'member-1',
          assignees: [{ id: 'member-1', name: 'Cristian' }],
          member_count: 1,
        },
      ];

      // Mock getRoutineFullData to return tasks with proper structure
      (getRoutineFullData as jest.Mock).mockResolvedValue({
        individual_tasks: mockTasks.map(task => ({
          id: task.id,
          name: task.name,
          recurring_template_id: task.recurring_template_id,
          days_of_week: ['monday', 'tuesday'], // Make tasks truly recurring with multiple days
          member_id: task.memberId,
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
        expect(screen.getAllByText('Brush Teeth')).toHaveLength(4); // 2 tasks × 2 days = 4 total
      });

      // Click on a task to open the mini popup, then click delete button
      const taskElements = screen.getAllByText('Brush Teeth');
      await user.click(taskElements[0]); // Click first task to open popup
      
      await waitFor(() => {
        const deleteButton = screen.getByTestId('delete-task-button');
        expect(deleteButton).toBeInTheDocument();
      });
      
      const deleteButton = screen.getByTestId('delete-task-button');
      await user.click(deleteButton);

      await waitFor(() => {
        // Should show delete confirmation modal (since tasks are recurring)
        expect(screen.getByText('Delete recurring event')).toBeInTheDocument();
      });

      // Click "This event only" radio button and then "OK"
      const thisEventOnlyRadio = screen.getByLabelText('This event only');
      await user.click(thisEventOnlyRadio);
      
      const okButton = screen.getByTestId('confirm-delete-button');
      await user.click(okButton);

        await waitFor(() => {
          // Monday task should be deleted immediately, Tuesday task should still be visible
          expect(screen.getAllByText('Brush Teeth')).toHaveLength(2);
        });
    });

    it('should delete immediately for standalone tasks', async () => {
      const user = userEvent.setup();
      
      const mockTasks = [
        {
          id: 'task-1',
          name: 'Standalone Task',
          recurring_template_id: 'template-1',
          days_of_week: ['monday'],
          memberId: 'member-1',
          assignees: [{ id: 'member-1', name: 'Cristian' }],
          member_count: 1,
        },
      ];

      // Mock getRoutineFullData to return tasks with proper structure
      (getRoutineFullData as jest.Mock).mockResolvedValue({
        individual_tasks: mockTasks.map(task => ({
          id: task.id,
          name: task.name,
          recurring_template_id: task.recurring_template_id,
          days_of_week: ['monday', 'tuesday'], // Make tasks truly recurring with multiple days
          member_id: task.memberId,
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
        expect(screen.getAllByText('Standalone Task')).toHaveLength(2); // 1 task × 2 days = 2 total
      });

      // Click on a task to open the mini popup, then click delete button
      const taskElements = screen.getAllByText('Standalone Task');
      await user.click(taskElements[0]); // Click first task to open popup
      
      await waitFor(() => {
        const deleteButton = screen.getByTestId('delete-task-button');
        expect(deleteButton).toBeInTheDocument();
      });
      
      const deleteButton = screen.getByTestId('delete-task-button');
      await user.click(deleteButton);

      await waitFor(() => {
        // Should show delete confirmation modal (since tasks are recurring)
        expect(screen.getByText('Delete recurring event')).toBeInTheDocument();
      });

      // Click "This event only" radio button and then "OK"
      const thisEventOnlyRadio = screen.getByLabelText('This event only');
      await user.click(thisEventOnlyRadio);
      
      const okButton = screen.getByTestId('confirm-delete-button');
      await user.click(okButton);

        await waitFor(() => {
          // Task should be deleted immediately
          expect(screen.getAllByText('Standalone Task')).toHaveLength(0);
        });
    });
  });

  describe('Modal cancellation', () => {
    it('should cancel deletion when cancel button is clicked', async () => {
      const user = userEvent.setup();
      
      const mockTasks = [
        {
          id: 'task-1',
          name: 'Recurring Task',
          recurring_template_id: 'template-1',
          days_of_week: ['monday'],
          memberId: 'member-1',
          assignees: [{ id: 'member-1', name: 'Cristian' }],
          member_count: 1,
        },
        {
          id: 'task-2',
          name: 'Recurring Task',
          recurring_template_id: 'template-1',
          days_of_week: ['tuesday'],
          memberId: 'member-1',
          assignees: [{ id: 'member-1', name: 'Cristian' }],
          member_count: 1,
        },
      ];

      // Mock getRoutineFullData to return tasks with proper structure
      (getRoutineFullData as jest.Mock).mockResolvedValue({
        individual_tasks: mockTasks.map(task => ({
          id: task.id,
          name: task.name,
          recurring_template_id: task.recurring_template_id,
          days_of_week: ['monday', 'tuesday'], // Make tasks truly recurring with multiple days
          member_id: task.memberId,
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
        expect(screen.getAllByText('Recurring Task')).toHaveLength(4); // 2 tasks × 2 days = 4 total
      });

      // Click on a task to open the mini popup, then click delete button
      const taskElements = screen.getAllByText('Recurring Task');
      await user.click(taskElements[0]); // Click first task to open popup
      
      await waitFor(() => {
        const deleteButton = screen.getByTestId('delete-task-button');
        expect(deleteButton).toBeInTheDocument();
      });
      
      const deleteButton = screen.getByTestId('delete-task-button');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete recurring event')).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByText(/Cancel/i);
      await user.click(cancelButton);

      await waitFor(() => {
        // Modal should be closed
        expect(screen.queryByText('Delete recurring event')).not.toBeInTheDocument();
        
        // Task should still be visible on both days
        expect(screen.getAllByText('Recurring Task')).toHaveLength(4); // 2 tasks × 2 days = 4 total
      });
    });
  });
});
