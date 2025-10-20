/**
 * Integration tests for assignee display in task popup
 * Tests the logic that displays assignee information in the task details popup
 */

describe('Assignee Display Logic', () => {
  const mockFamilyMembers = [
    { id: '1', name: 'Cristian', role: 'parent', color: 'blue', avatar_url: null },
    { id: '2', name: 'Cristina', role: 'parent', color: 'yellow', avatar_url: null },
    { id: '3', name: 'Guille', role: 'child', color: 'green', avatar_url: null },
    { id: '4', name: 'Clàudia', role: 'child', color: 'purple', avatar_url: null },
  ]

  /**
   * Function that replicates the assignee display logic from ManualRoutineBuilder.tsx
   */
  const getAssigneeDisplayText = (task: any, memberId: string, familyMembers: any[]) => {
    // For multi-member tasks, display all assignees
    if (task.assignees && task.assignees.length > 1) {
      const assigneeNames = task.assignees.map((assignee: any) => assignee.name).join(', ')
      return `Assigned to ${assigneeNames}`
    }
    
    // For single-member tasks, try to find the member
    if (task.assignees && task.assignees.length === 1) {
      return `Assigned to ${task.assignees[0].name}`
    }
    
    // Fallback: try to find member by memberId
    const member = familyMembers.find(m => m.id === memberId)
    return `Assigned to ${member?.name || 'Unknown'}`
  }

  describe('Multi-member task assignee display', () => {
    it('should display all assignee names for multi-member tasks', () => {
      const multiMemberTask = {
        id: 'shared-task-1',
        name: 'Family Dinner',
        assignees: [
          { id: '1', name: 'Cristian', role: 'parent', color: 'blue', avatar_url: null },
          { id: '2', name: 'Cristina', role: 'parent', color: 'yellow', avatar_url: null },
          { id: '3', name: 'Guille', role: 'child', color: 'green', avatar_url: null },
        ],
        member_count: 3,
      }

      const displayText = getAssigneeDisplayText(multiMemberTask, '1', mockFamilyMembers)
      
      expect(displayText).toBe('Assigned to Cristian, Cristina, Guille')
    })

    it('should handle multi-member task with 2 assignees', () => {
      const twoMemberTask = {
        id: 'shared-task-2',
        name: 'Shared Chores',
        assignees: [
          { id: '1', name: 'Cristian', role: 'parent', color: 'blue', avatar_url: null },
          { id: '3', name: 'Guille', role: 'child', color: 'green', avatar_url: null },
        ],
        member_count: 2,
      }

      const displayText = getAssigneeDisplayText(twoMemberTask, '1', mockFamilyMembers)
      
      expect(displayText).toBe('Assigned to Cristian, Guille')
    })

    it('should handle multi-member task with empty assignees array', () => {
      const taskWithEmptyAssignees = {
        id: 'task-3',
        name: 'Broken Task',
        assignees: [],
        member_count: 2,
      }

      const displayText = getAssigneeDisplayText(taskWithEmptyAssignees, '1', mockFamilyMembers)
      
      // Should fall back to memberId lookup
      expect(displayText).toBe('Assigned to Cristian')
    })
  })

  describe('Single-member task assignee display', () => {
    it('should display single assignee name for single-member tasks', () => {
      const singleMemberTask = {
        id: 'single-task-1',
        name: 'Personal Task',
        assignees: [
          { id: '1', name: 'Cristian', role: 'parent', color: 'blue', avatar_url: null },
        ],
        member_count: 1,
      }

      const displayText = getAssigneeDisplayText(singleMemberTask, '1', mockFamilyMembers)
      
      expect(displayText).toBe('Assigned to Cristian')
    })

    it('should handle single-member task with empty assignees array', () => {
      const taskWithNoAssignees = {
        id: 'task-4',
        name: 'Legacy Task',
        assignees: [],
        member_count: 1,
      }

      const displayText = getAssigneeDisplayText(taskWithNoAssignees, '2', mockFamilyMembers)
      
      // Should fall back to memberId lookup
      expect(displayText).toBe('Assigned to Cristina')
    })
  })

  describe('Fallback behavior', () => {
    it('should fall back to memberId lookup when assignees are missing', () => {
      const taskWithoutAssignees = {
        id: 'task-5',
        name: 'Old Task',
        // No assignees property
        member_count: 1,
      }

      const displayText = getAssigneeDisplayText(taskWithoutAssignees, '3', mockFamilyMembers)
      
      expect(displayText).toBe('Assigned to Guille')
    })

    it('should display "Unknown" when memberId is not found in family members', () => {
      const taskWithoutAssignees = {
        id: 'task-6',
        name: 'Orphaned Task',
        member_count: 1,
      }

      const displayText = getAssigneeDisplayText(taskWithoutAssignees, 'nonexistent-id', mockFamilyMembers)
      
      expect(displayText).toBe('Assigned to Unknown')
    })

    it('should display "Unknown" when no assignees and no memberId', () => {
      const taskWithoutAssignees = {
        id: 'task-7',
        name: 'Broken Task',
        member_count: 1,
      }

      const displayText = getAssigneeDisplayText(taskWithoutAssignees, '', mockFamilyMembers)
      
      expect(displayText).toBe('Assigned to Unknown')
    })
  })

  describe('Edge cases', () => {
    it('should handle task with null assignees', () => {
      const taskWithNullAssignees = {
        id: 'task-8',
        name: 'Null Assignees Task',
        assignees: null,
        member_count: 2,
      }

      const displayText = getAssigneeDisplayText(taskWithNullAssignees, '1', mockFamilyMembers)
      
      expect(displayText).toBe('Assigned to Cristian')
    })

    it('should handle task with undefined assignees', () => {
      const taskWithUndefinedAssignees = {
        id: 'task-9',
        name: 'Undefined Assignees Task',
        assignees: undefined,
        member_count: 2,
      }

      const displayText = getAssigneeDisplayText(taskWithUndefinedAssignees, '2', mockFamilyMembers)
      
      expect(displayText).toBe('Assigned to Cristina')
    })

    it('should handle task with assignees containing missing names', () => {
      const taskWithIncompleteAssignees = {
        id: 'task-10',
        name: 'Incomplete Assignees Task',
        assignees: [
          { id: '1', name: 'Cristian', role: 'parent', color: 'blue', avatar_url: null },
          { id: '2', name: '', role: 'parent', color: 'yellow', avatar_url: null }, // Empty name
          { id: '3', name: 'Guille', role: 'child', color: 'green', avatar_url: null },
        ],
        member_count: 3,
      }

      const displayText = getAssigneeDisplayText(taskWithIncompleteAssignees, '1', mockFamilyMembers)
      
      expect(displayText).toBe('Assigned to Cristian, , Guille')
    })
  })

  describe('Real-world scenarios', () => {
    it('should handle the original bug case: multi-member task showing "Unknown"', () => {
      // This replicates the exact scenario from the user's report
      const sharedTask = {
        id: 'shared-task-bug',
        name: 'another shared task',
        assignees: [
          { id: '1', name: 'Cristian', role: 'parent', color: 'blue', avatar_url: null },
          { id: '2', name: 'Cristina', role: 'parent', color: 'yellow', avatar_url: null },
          { id: '3', name: 'Guille', role: 'child', color: 'green', avatar_url: null },
        ],
        member_count: 3,
      }

      // Simulate clicking on the task from member '1' perspective
      const displayText = getAssigneeDisplayText(sharedTask, '1', mockFamilyMembers)
      
      // Should NOT show "Unknown" - should show all assignee names
      expect(displayText).toBe('Assigned to Cristian, Cristina, Guille')
      expect(displayText).not.toContain('Unknown')
    })

    it('should handle task clicked from different member perspectives', () => {
      const sharedTask = {
        id: 'shared-task-perspective',
        name: 'Family Activity',
        assignees: [
          { id: '1', name: 'Cristian', role: 'parent', color: 'blue', avatar_url: null },
          { id: '3', name: 'Guille', role: 'child', color: 'green', avatar_url: null },
        ],
        member_count: 2,
      }

      // Click from Cristian's perspective
      const displayTextFromCristian = getAssigneeDisplayText(sharedTask, '1', mockFamilyMembers)
      expect(displayTextFromCristian).toBe('Assigned to Cristian, Guille')

      // Click from Guille's perspective
      const displayTextFromGuille = getAssigneeDisplayText(sharedTask, '3', mockFamilyMembers)
      expect(displayTextFromGuille).toBe('Assigned to Cristian, Guille')

      // Click from someone not assigned to the task
      const displayTextFromOther = getAssigneeDisplayText(sharedTask, '4', mockFamilyMembers)
      expect(displayTextFromOther).toBe('Assigned to Cristian, Guille')
    })
  })
})
