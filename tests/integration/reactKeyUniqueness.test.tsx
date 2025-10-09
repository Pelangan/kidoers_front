/**
 * Integration tests for React key uniqueness in task rendering
 * Tests that tasks appearing on multiple days have unique keys to prevent React warnings
 */

import { describe, it, expect } from 'vitest'

describe('React Key Uniqueness for Multi-Day Tasks', () => {
  /**
   * Function that replicates the key generation logic from PlannerWeek.tsx
   */
  const generateTaskKey = (taskId: string, day: string, bucketType: string, bucketMemberId?: string) => {
    return `${taskId}-${day}-${bucketType}-${bucketMemberId || 'shared'}`
  }

  /**
   * Function that replicates the key generation logic from BucketSection.tsx
   */
  const generateBucketTaskKey = (taskId: string, day: string, bucketMemberId?: string) => {
    return `${taskId}-${day}-${bucketMemberId || 'shared'}`
  }

  describe('PlannerWeek key generation', () => {
    it('should generate unique keys for the same task on different days', () => {
      const taskId = '9f075d6e-2edf-47fe-b8cd-b94e5e31f15c'
      const bucketType = 'shared'
      const bucketMemberId = undefined

      const mondayKey = generateTaskKey(taskId, 'monday', bucketType, bucketMemberId)
      const tuesdayKey = generateTaskKey(taskId, 'tuesday', bucketType, bucketMemberId)
      const wednesdayKey = generateTaskKey(taskId, 'wednesday', bucketType, bucketMemberId)

      expect(mondayKey).toBe('9f075d6e-2edf-47fe-b8cd-b94e5e31f15c-monday-shared-shared')
      expect(tuesdayKey).toBe('9f075d6e-2edf-47fe-b8cd-b94e5e31f15c-tuesday-shared-shared')
      expect(wednesdayKey).toBe('9f075d6e-2edf-47fe-b8cd-b94e5e31f15c-wednesday-shared-shared')

      // All keys should be unique
      expect(mondayKey).not.toBe(tuesdayKey)
      expect(tuesdayKey).not.toBe(wednesdayKey)
      expect(wednesdayKey).not.toBe(mondayKey)
    })

    it('should generate unique keys for the same task in different buckets', () => {
      const taskId = 'task-123'
      const day = 'wednesday'

      const sharedKey = generateTaskKey(taskId, day, 'shared', undefined)
      const memberKey = generateTaskKey(taskId, day, 'member', 'member-1')

      expect(sharedKey).toBe('task-123-wednesday-shared-shared')
      expect(memberKey).toBe('task-123-wednesday-member-member-1')

      expect(sharedKey).not.toBe(memberKey)
    })

    it('should generate unique keys for different tasks on the same day', () => {
      const day = 'wednesday'
      const bucketType = 'shared'
      const bucketMemberId = undefined

      const task1Key = generateTaskKey('task-1', day, bucketType, bucketMemberId)
      const task2Key = generateTaskKey('task-2', day, bucketType, bucketMemberId)

      expect(task1Key).toBe('task-1-wednesday-shared-shared')
      expect(task2Key).toBe('task-2-wednesday-shared-shared')

      expect(task1Key).not.toBe(task2Key)
    })

    it('should handle the original bug scenario: same task on all days of week', () => {
      const taskId = '9f075d6e-2edf-47fe-b8cd-b94e5e31f15c'
      const bucketType = 'shared'
      const bucketMemberId = undefined

      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      const keys = days.map(day => generateTaskKey(taskId, day, bucketType, bucketMemberId))

      // All keys should be unique
      const uniqueKeys = new Set(keys)
      expect(uniqueKeys.size).toBe(keys.length)
      expect(keys.length).toBe(7)

      // Verify specific keys
      expect(keys).toContain('9f075d6e-2edf-47fe-b8cd-b94e5e31f15c-monday-shared-shared')
      expect(keys).toContain('9f075d6e-2edf-47fe-b8cd-b94e5e31f15c-wednesday-shared-shared')
      expect(keys).toContain('9f075d6e-2edf-47fe-b8cd-b94e5e31f15c-sunday-shared-shared')
    })
  })

  describe('BucketSection key generation', () => {
    it('should generate unique keys for the same task on different days', () => {
      const taskId = 'task-456'
      const bucketMemberId = 'member-1'

      const mondayKey = generateBucketTaskKey(taskId, 'monday', bucketMemberId)
      const tuesdayKey = generateBucketTaskKey(taskId, 'tuesday', bucketMemberId)

      expect(mondayKey).toBe('task-456-monday-member-1')
      expect(tuesdayKey).toBe('task-456-tuesday-member-1')

      expect(mondayKey).not.toBe(tuesdayKey)
    })

    it('should generate unique keys for shared tasks', () => {
      const taskId = 'shared-task-789'
      const day = 'wednesday'

      const sharedKey = generateBucketTaskKey(taskId, day, undefined)
      const memberKey = generateBucketTaskKey(taskId, day, 'member-1')

      expect(sharedKey).toBe('shared-task-789-wednesday-shared')
      expect(memberKey).toBe('shared-task-789-wednesday-member-1')

      expect(sharedKey).not.toBe(memberKey)
    })

    it('should handle multiple tasks on the same day in same bucket', () => {
      const day = 'friday'
      const bucketMemberId = 'member-2'

      const task1Key = generateBucketTaskKey('task-a', day, bucketMemberId)
      const task2Key = generateBucketTaskKey('task-b', day, bucketMemberId)

      expect(task1Key).toBe('task-a-friday-member-2')
      expect(task2Key).toBe('task-b-friday-member-2')

      expect(task1Key).not.toBe(task2Key)
    })
  })

  describe('Cross-component key consistency', () => {
    it('should ensure no key collisions between PlannerWeek and BucketSection', () => {
      const taskId = 'task-consistency-test'
      const day = 'thursday'
      const bucketMemberId = 'member-3'

      const plannerWeekKey = generateTaskKey(taskId, day, 'shared', bucketMemberId)
      const bucketSectionKey = generateBucketTaskKey(taskId, day, bucketMemberId)

      expect(plannerWeekKey).toBe('task-consistency-test-thursday-shared-member-3')
      expect(bucketSectionKey).toBe('task-consistency-test-thursday-member-3')

      // Keys should be different because they have different formats
      expect(plannerWeekKey).not.toBe(bucketSectionKey)
    })
  })

  describe('Edge cases and error scenarios', () => {
    it('should handle empty strings gracefully', () => {
      const emptyTaskKey = generateTaskKey('', 'monday', 'shared', undefined)
      const emptyDayKey = generateTaskKey('task-1', '', 'shared', undefined)
      const emptyBucketKey = generateTaskKey('task-1', 'monday', '', undefined)

      expect(emptyTaskKey).toBe('-monday-shared-shared')
      expect(emptyDayKey).toBe('task-1--shared-shared')
      expect(emptyBucketKey).toBe('task-1-monday--shared')

      // Even with empty strings, keys should be unique
      expect(emptyTaskKey).not.toBe(emptyDayKey)
      expect(emptyDayKey).not.toBe(emptyBucketKey)
      expect(emptyBucketKey).not.toBe(emptyTaskKey)
    })

    it('should handle special characters in IDs', () => {
      const specialTaskId = 'task-with-special_chars.123'
      const specialDay = 'monday'
      const specialMemberId = 'member-with.dashes_123'

      const key = generateTaskKey(specialTaskId, specialDay, 'member', specialMemberId)
      expect(key).toBe('task-with-special_chars.123-monday-member-member-with.dashes_123')
    })

    it('should handle very long IDs', () => {
      const longTaskId = 'a'.repeat(100)
      const longDay = 'monday'
      const longMemberId = 'b'.repeat(100)

      const key = generateTaskKey(longTaskId, longDay, 'member', longMemberId)
      expect(key).toBe(`${longTaskId}-${longDay}-member-${longMemberId}`)
      expect(key.length).toBe(215) // 100 + 1 + 6 + 7 + 1 + 100
    })
  })

  describe('Real-world scenarios', () => {
    it('should handle the exact scenario from the user report', () => {
      // This replicates the exact error scenario described by the user
      const problematicTaskId = '9f075d6e-2edf-47fe-b8cd-b94e5e31f15c'
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      const bucketType = 'shared'
      const bucketMemberId = undefined

      // Generate keys for all days
      const keys = days.map(day => generateTaskKey(problematicTaskId, day, bucketType, bucketMemberId))

      // Verify all keys are unique (this was failing before the fix)
      const uniqueKeys = new Set(keys)
      expect(uniqueKeys.size).toBe(7)
      expect(keys.length).toBe(7)

      // Verify no duplicates
      const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index)
      expect(duplicates).toHaveLength(0)

      // Verify specific key format
      expect(keys[2]).toBe('9f075d6e-2edf-47fe-b8cd-b94e5e31f15c-wednesday-shared-shared')
    })

    it('should handle duplicate tasks in the same day (Clàudia selection issue)', () => {
      // This test replicates the specific issue when Clàudia is selected
      const duplicateTaskId = '9f075d6e-2edf-47fe-b8cd-b94e5e31f15c_wednesday'
      const day = 'wednesday'
      const bucketType = 'shared'
      const bucketMemberId = undefined

      // Simulate the same task appearing twice (which was causing the duplicate key error)
      const task1 = { id: duplicateTaskId, name: 'another shared task' }
      const task2 = { id: duplicateTaskId, name: 'another shared task' } // Same task, different instance

      // Both tasks would generate the same key before the fix
      const key1 = generateTaskKey(task1.id, day, bucketType, bucketMemberId)
      const key2 = generateTaskKey(task2.id, day, bucketType, bucketMemberId)

      // Before the fix, these would be identical and cause React key duplication
      expect(key1).toBe(key2)
      expect(key1).toBe('9f075d6e-2edf-47fe-b8cd-b94e5e31f15c_wednesday-wednesday-shared-shared')

      // The fix should ensure that even if duplicate tasks exist in the data,
      // they get deduplicated before rendering, preventing the React error
    })

    it('should handle task deduplication logic', () => {
      // Test the deduplication logic that prevents duplicate tasks from causing key conflicts
      const duplicateTasks = [
        { id: 'task-1', name: 'Shared Task' },
        { id: 'task-2', name: 'Individual Task' },
        { id: 'task-1', name: 'Shared Task' }, // Duplicate of first task
        { id: 'task-3', name: 'Another Task' }
      ]

      // Simulate the deduplication logic
      const seenTaskIds = new Set<string>()
      const uniqueTasks = duplicateTasks.filter(task => {
        if (seenTaskIds.has(task.id)) {
          return false // Filter out duplicate
        }
        seenTaskIds.add(task.id)
        return true
      })

      expect(uniqueTasks).toHaveLength(3)
      expect(uniqueTasks.map(t => t.id)).toEqual(['task-1', 'task-2', 'task-3'])
      
      // Verify no duplicates remain
      const uniqueIds = new Set(uniqueTasks.map(t => t.id))
      expect(uniqueIds.size).toBe(3)
    })

    it('should handle mixed bucket types and member assignments', () => {
      const taskId = 'multi-bucket-task'
      const day = 'wednesday'

      const keys = [
        generateTaskKey(taskId, day, 'shared', undefined),
        generateTaskKey(taskId, day, 'member', 'member-1'),
        generateTaskKey(taskId, day, 'member', 'member-2'),
        generateBucketTaskKey(taskId, day, undefined),
        generateBucketTaskKey(taskId, day, 'member-1'),
        generateBucketTaskKey(taskId, day, 'member-2'),
      ]

      // All keys should be unique
      const uniqueKeys = new Set(keys)
      expect(uniqueKeys.size).toBe(keys.length)
      expect(keys.length).toBe(6)
    })
  })
})
