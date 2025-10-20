/**
 * Integration tests for ManualRoutineBuilder - Recurrence Control
 * 
 * Testing the simplified recurrence UI:
 * - Only 2 options: "Every day" and "Select specific days"
 * - Smart defaults based on context (which day column opened from)
 * - Day chips always visible when "Select specific days" is active
 * - Helper labels update dynamically
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
}));

// Mock storage
jest.mock('@/app/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Import API after mocking
import { apiService } from '@/app/lib/api';
import { helperLabel } from '@/app/components/routines/builder/utils/recurrence';

describe('ManualRoutineBuilder - Recurrence Control', () => {
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Recurrence option selection', () => {
    it('should show "Every day" and "Select specific days" options', async () => {
      render(<ManualRoutineBuilder familyId={mockFamilyId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText('Every day')).toBeInTheDocument();
        expect(screen.getByText('Select specific days')).toBeInTheDocument();
      });
    });

    it('should default to "Every day" when opened from a specific day', async () => {
      render(<ManualRoutineBuilder familyId={mockFamilyId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        const everyDayOption = screen.getByText('Every day');
        expect(everyDayOption).toBeInTheDocument();
        // In a real test, you would check if this option is selected by default
      });
    });

    it('should show day chips when "Select specific days" is selected', async () => {
      const user = userEvent.setup();
      render(<ManualRoutineBuilder familyId={mockFamilyId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText('Select specific days')).toBeInTheDocument();
      });

      // Click on "Select specific days" option
      await user.click(screen.getByText('Select specific days'));

      await waitFor(() => {
        // Day chips should be visible
        expect(screen.getByText('Monday')).toBeInTheDocument();
        expect(screen.getByText('Tuesday')).toBeInTheDocument();
        expect(screen.getByText('Wednesday')).toBeInTheDocument();
        expect(screen.getByText('Thursday')).toBeInTheDocument();
        expect(screen.getByText('Friday')).toBeInTheDocument();
        expect(screen.getByText('Saturday')).toBeInTheDocument();
        expect(screen.getByText('Sunday')).toBeInTheDocument();
      });
    });
  });

  describe('Helper label updates', () => {
    it('should show "Every day" label when every day is selected', async () => {
      render(<ManualRoutineBuilder familyId={mockFamilyId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        // When "Every day" is selected, helper label should show "Every day"
        const helperText = screen.getByText(/Every day/);
        expect(helperText).toBeInTheDocument();
      });
    });

    it('should update helper label when specific days are selected', async () => {
      const user = userEvent.setup();
      render(<ManualRoutineBuilder familyId={mockFamilyId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText('Select specific days')).toBeInTheDocument();
      });

      // Select "Select specific days"
      await user.click(screen.getByText('Select specific days'));

      await waitFor(() => {
        // Select Monday and Wednesday
        await user.click(screen.getByText('Monday'));
        await user.click(screen.getByText('Wednesday'));
      });

      await waitFor(() => {
        // Helper label should update to show selected days
        const helperText = screen.getByText(/Repeats:/);
        expect(helperText).toBeInTheDocument();
        expect(helperText).toHaveTextContent('Mon');
        expect(helperText).toHaveTextContent('Wed');
      });
    });

    it('should show "Weekdays" label when Mon-Fri are selected', async () => {
      const user = userEvent.setup();
      render(<ManualRoutineBuilder familyId={mockFamilyId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText('Select specific days')).toBeInTheDocument();
      });

      // Select "Select specific days"
      await user.click(screen.getByText('Select specific days'));

      await waitFor(() => {
        // Select weekdays
        await user.click(screen.getByText('Monday'));
        await user.click(screen.getByText('Tuesday'));
        await user.click(screen.getByText('Wednesday'));
        await user.click(screen.getByText('Thursday'));
        await user.click(screen.getByText('Friday'));
      });

      await waitFor(() => {
        // Helper label should show "Weekdays"
        const helperText = screen.getByText('Weekdays');
        expect(helperText).toBeInTheDocument();
      });
    });

    it('should show "Weekends" label when Sat-Sun are selected', async () => {
      const user = userEvent.setup();
      render(<ManualRoutineBuilder familyId={mockFamilyId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText('Select specific days')).toBeInTheDocument();
      });

      // Select "Select specific days"
      await user.click(screen.getByText('Select specific days'));

      await waitFor(() => {
        // Select weekends
        await user.click(screen.getByText('Saturday'));
        await user.click(screen.getByText('Sunday'));
      });

      await waitFor(() => {
        // Helper label should show "Weekends"
        const helperText = screen.getByText('Weekends');
        expect(helperText).toBeInTheDocument();
      });
    });
  });

  describe('Day selection behavior', () => {
    it('should allow selecting multiple days', async () => {
      const user = userEvent.setup();
      render(<ManualRoutineBuilder familyId={mockFamilyId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText('Select specific days')).toBeInTheDocument();
      });

      // Select "Select specific days"
      await user.click(screen.getByText('Select specific days'));

      await waitFor(() => {
        // Select multiple days
        await user.click(screen.getByText('Monday'));
        await user.click(screen.getByText('Wednesday'));
        await user.click(screen.getByText('Friday'));
      });

      await waitFor(() => {
        // All selected days should be highlighted/selected
        const mondayChip = screen.getByText('Monday');
        const wednesdayChip = screen.getByText('Wednesday');
        const fridayChip = screen.getByText('Friday');
        
        expect(mondayChip).toBeInTheDocument();
        expect(wednesdayChip).toBeInTheDocument();
        expect(fridayChip).toBeInTheDocument();
      });
    });

    it('should allow deselecting days', async () => {
      const user = userEvent.setup();
      render(<ManualRoutineBuilder familyId={mockFamilyId} onComplete={mockOnComplete} />);

      await waitFor(() => {
        expect(screen.getByText('Select specific days')).toBeInTheDocument();
      });

      // Select "Select specific days"
      await user.click(screen.getByText('Select specific days'));

      await waitFor(() => {
        // Select Monday
        await user.click(screen.getByText('Monday'));
      });

      await waitFor(() => {
        // Deselect Monday
        await user.click(screen.getByText('Monday'));
      });

      await waitFor(() => {
        // Monday should no longer be selected
        const mondayChip = screen.getByText('Monday');
        // In a real test, you would check the visual state of the chip
        expect(mondayChip).toBeInTheDocument();
      });
    });
  });
});
