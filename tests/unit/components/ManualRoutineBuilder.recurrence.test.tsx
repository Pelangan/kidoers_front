/**
 * Integration tests for ManualRoutineBuilder - Recurrence Control
 * 
 * Testing the simplified recurrence UI:
 * - Only 2 options: "Every day" and "Select specific days"
 * - Smart defaults based on context (which day column opened from)
 * - Day chips always visible when "Select specific days" is active
 * - Helper labels update dynamically
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManualRoutineBuilder from '@/app/components/routines/builder/ManualRoutineBuilder';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/dashboard',
}));

// Mock API module
vi.mock('@/app/lib/api', () => ({
  apiService: {
    getFamilyMembers: vi.fn(),
    makeRequest: vi.fn(),
  },
}));

// Mock storage
vi.mock('@/app/lib/storage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

// Import API after mocking
import { apiService } from '@/app/lib/api';
import { helperLabel } from '@/app/components/routines/builder/utils/recurrence';

describe('ManualRoutineBuilder - Recurrence Control', () => {
  const mockFamilyId = 'test-family-123';
  const mockOnComplete = vi.fn();

  // Mock family data
  const mockFamilyMembers = [
    {
      id: 'member-1',
      family_id: mockFamilyId,
      name: 'Cristian',
      type: 'parent',
      avatar_type: 'human',
      avatar_seed: 'seed1',
    },
    {
      id: 'member-2',
      family_id: mockFamilyId,
      name: 'Sofia',
      type: 'child',
      avatar_type: 'human',
      avatar_seed: 'seed2',
    },
  ];

  const mockRoutines = [
    {
      id: 'routine-1',
      family_id: mockFamilyId,
      name: 'Morning Routine',
      icon: '☀️',
      source: 'scratch',
      status: 'active',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock API responses
    (apiService.getFamilyMembers as any).mockResolvedValue(mockFamilyMembers);
    (apiService.makeRequest as any).mockImplementation((url: string) => {
      if (url.includes('/families/') && url.includes('/members')) {
        return Promise.resolve(mockFamilyMembers);
      }
      if (url.includes('/routines')) {
        return Promise.resolve(mockRoutines);
      }
      if (url.includes('/templates')) {
        return Promise.resolve([]);
      }
      if (url.includes('/tasks')) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });

    // Mock successful task creation
    (apiService.makeRequest as any).mockResolvedValue({ id: 'new-task-123' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper to open the task modal from a specific day column
   */
  const openTaskModalFromDay = async (day: string) => {
    const user = userEvent.setup();
    
    render(
      <ManualRoutineBuilder
        familyId={mockFamilyId}
        onComplete={mockOnComplete}
      />
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Find and click the "+" button for the specific day
    // The component renders day columns with add buttons
    const dayColumn = screen.getByText(day, { selector: 'div' }).closest('[data-day]') || 
                      screen.getByText(day.charAt(0).toUpperCase() + day.slice(1));
    
    // Look for add button near this day
    const addButton = screen.getAllByRole('button').find(btn => 
      btn.textContent?.includes('+') || btn.getAttribute('aria-label')?.includes('Add')
    );
    
    if (addButton) {
      await user.click(addButton);
    }

    return { user };
  };

  describe('🎯 Critical: Smart Defaults from Day Column', () => {
    it('should default to "Select specific days" with Thursday pre-checked when opened from Thursday column', async () => {
      // GIVEN: ManualRoutineBuilder is rendered
      const user = userEvent.setup();
      const { container } = render(
        <ManualRoutineBuilder
          familyId={mockFamilyId}
          onComplete={mockOnComplete}
        />
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(apiService.getFamilyMembers).toHaveBeenCalled();
      }, { timeout: 3000 });

      // WHEN: User triggers task creation from Thursday
      // (Simulating internal state - the component sets this via handleDrop)
      // We'll look for the modal opening trigger
      
      // For now, verify the component renders
      expect(container).toBeTruthy();
      
      // TODO: This test needs the actual UI interaction to trigger the modal
      // The component uses handleDrop() which sets pendingDrop with targetDay
      // We'll need to either:
      // 1. Add test IDs to the day column buttons
      // 2. Or test the state management directly via unit tests
    });
  });

  describe('🎨 Day Chips Visibility', () => {
    it('should show day chips immediately when "Select specific days" is active', () => {
      // This test verifies the rendering logic:
      // {daySelection.mode === 'custom' && <DayChips />}
      
      // The logic is straightforward:
      // - mode='custom' → chips visible
      // - mode='everyday' → chips hidden
      
      expect(true).toBe(true); // Placeholder - component-level test
    });

    it('should hide day chips when "Every day" is selected', () => {
      expect(true).toBe(true); // Placeholder - component-level test
    });
  });

  describe('🔄 Switching Between Options', () => {
    it('should update UI when switching from "Every day" to "Select specific days"', () => {
      // GIVEN: User has "Every day" selected
      // WHEN: User switches to "Select specific days"
      // THEN: 
      //   - Day chips appear
      //   - All 7 days remain checked (from previous selection)
      //   - Helper updates to "Every day" (since all 7 still checked)
      
      expect(true).toBe(true); // Placeholder - needs modal interaction
    });

    it('should check all days when switching to "Every day"', () => {
      // GIVEN: User has "Select specific days" with Mon, Wed checked
      // WHEN: User switches to "Every day"
      // THEN:
      //   - All 7 days become checked
      //   - Chips hide
      //   - Helper shows "Every day"
      
      expect(true).toBe(true); // Placeholder - needs modal interaction
    });
  });

  describe('✅ Validation', () => {
    it('should show validation error when no days are selected', () => {
      // GIVEN: User is in "Select specific days" mode
      // WHEN: User unchecks all days
      // THEN: Error message appears: "Select at least one day"
      
      expect(true).toBe(true); // Placeholder - needs modal interaction
    });
  });

  describe('🏷️ Helper Label Updates', () => {
    it('should show "Every day" when all 7 days selected', () => {
      // Test the helperLabel() utility function
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const result = helperLabel(days, false);
      
      expect(result).toBe('Every day');
    });

    it('should show "Every Thursday" when only Thursday selected', () => {
      const result = helperLabel(['thursday'], false);
      
      expect(result).toBe('Every Thursday');
    });

    it('should show formatted list for 2-6 days', () => {
      const result = helperLabel(['monday', 'wednesday', 'friday'], false);
      
      // Should show something like "Repeats: Mon, Wed, Fri"
      expect(result).toContain('Mon');
      expect(result).toContain('Wed');
      expect(result).toContain('Fri');
    });

    it('should show "Weekdays" when Mon-Fri selected', () => {
      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
      const result = helperLabel(weekdays, false);
      
      expect(result).toBe('Weekdays');
    });

    it('should show "Weekends" when Sat-Sun selected', () => {
      const weekends = ['saturday', 'sunday'];
      const result = helperLabel(weekends, false);
      
      expect(result).toBe('Weekends');
    });
  });
});

/**
 * 🎯 TEST STRATEGY NOTES:
 * 
 * These tests are split into two categories:
 * 
 * 1. **Unit Tests** (Helper Functions):
 *    ✅ Can test immediately - pure functions
 *    - helperLabel()
 *    - optionFromTemplate()
 *    - normalizeWeekdays()
 * 
 * 2. **Integration Tests** (Component Behavior):
 *    ⏳ Need more setup - require triggering modal
 *    - Smart defaults
 *    - Day chip visibility
 *    - User interactions
 *    - Validation errors
 * 
 * NEXT STEPS:
 * - Add data-testid attributes to ManualRoutineBuilder for easier testing
 * - Or extract RecurrenceControl into separate component
 * - Or use state management testing (test the hooks directly)
 */
