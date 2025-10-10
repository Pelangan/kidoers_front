/**
 * Mock data factories for testing
 * Provides realistic test data for components and integration tests
 */

// Mock Family Members
export const mockFamilyMembers = [
  {
    id: '1',
    name: 'Parent User',
    role: 'parent' as const,
    color: 'blue',
    age: 35,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Parent',
  },
  {
    id: '2',
    name: 'Child One',
    role: 'child' as const,
    color: 'green',
    age: 8,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Child1',
  },
  {
    id: '3',
    name: 'Child Two',
    role: 'child' as const,
    color: 'yellow',
    age: 5,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Child2',
  },
];

// Mock Family
export const mockFamily = {
  id: 'family-1',
  name: 'Test Family',
  created_by: 'user-1',
  created_at: '2025-01-01T00:00:00Z',
  setup_state: 'completed' as const,
};

// Mock Tasks
export const mockTasks = [
  {
    id: 'task-1',
    name: 'Brush Teeth',
    description: 'Morning dental hygiene',
    points: 5,
    duration_mins: 5,
    time_of_day: 'morning' as const,
    frequency: 'daily' as const,
    days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  },
  {
    id: 'task-2',
    name: 'Clean Room',
    description: 'Tidy up bedroom',
    points: 10,
    duration_mins: 15,
    time_of_day: 'afternoon' as const,
    frequency: 'weekly' as const,
    days_of_week: ['saturday'],
  },
];

// Mock Single-Member Task
export const mockSingleMemberTask = {
  id: 'task-single-1',
  name: 'Individual Task',
  description: 'Single member task',
  points: 10,
  duration_mins: 20,
  time_of_day: 'morning' as const,
  frequency: 'daily' as const,
  days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  member_count: 1,
  assignees: [
    {
      id: '2',
      name: 'Child One',
      role: 'child' as const,
      color: 'green',
    },
  ],
};

// Mock Routine
export const mockRoutine = {
  id: 'routine-1',
  family_id: 'family-1',
  name: 'Morning Routine',
  status: 'active' as const,
  source: 'custom',
};

// Factory functions for creating test data

/**
 * Create a mock family member with custom overrides
 */
export function createMockFamilyMember(overrides: Partial<typeof mockFamilyMembers[0]> = {}) {
  return {
    id: `member-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Member',
    role: 'child' as const,
    color: 'blue',
    age: 10,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
    ...overrides,
  };
}

/**
 * Create a mock task with custom overrides
 */
export function createMockTask(overrides: Partial<typeof mockTasks[0]> = {}) {
  return {
    id: `task-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Task',
    description: 'Test description',
    points: 5,
    duration_mins: 10,
    time_of_day: 'morning' as const,
    frequency: 'daily' as const,
    days_of_week: ['monday'],
    ...overrides,
  };
}

/**
 * Create a mock family with custom overrides
 */
export function createMockFamily(overrides: Partial<typeof mockFamily> = {}) {
  return {
    id: `family-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Family',
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    setup_state: 'completed' as const,
    ...overrides,
  };
}

