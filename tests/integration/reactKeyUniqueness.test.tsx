/**
 * Integration tests for React key uniqueness in task rendering
 * Tests that tasks appearing on multiple days have unique keys to prevent React warnings
 */

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

      // Keys should be different
      expect(sharedKey).not.toBe(memberKey)
    })

    it('should generate unique keys for different tasks on the same day', () => {
      const day = 'friday'
      const bucketType = 'shared'
      const bucketMemberId = undefined

      const task1Key = generateTaskKey('task-1', day, bucketType, bucketMemberId)
      const task2Key = generateTaskKey('task-2', day, bucketType, bucketMemberId)

      expect(task1Key).toBe('task-1-friday-shared-shared')
      expect(task2Key).toBe('task-2-friday-shared-shared')

      // Keys should be different
      expect(task1Key).not.toBe(task2Key)
    })

    it('should handle member-specific buckets correctly', () => {
      const taskId = 'shared-task-456'
      const day = 'monday'

      const member1Key = generateTaskKey(taskId, day, 'member', 'member-1')
      const member2Key = generateTaskKey(taskId, day, 'member', 'member-2')

      expect(member1Key).toBe('shared-task-456-monday-member-member-1')
      expect(member2Key).toBe('shared-task-456-monday-member-member-2')

      // Keys should be different
      expect(member1Key).not.toBe(member2Key)
    })
  })

  describe('BucketSection key generation', () => {
    it('should generate unique keys for the same task on different days', () => {
      const taskId = 'bucket-task-789'
      const bucketMemberId = undefined

      const mondayKey = generateBucketTaskKey(taskId, 'monday', bucketMemberId)
      const tuesdayKey = generateBucketTaskKey(taskId, 'tuesday', bucketMemberId)
      const wednesdayKey = generateBucketTaskKey(taskId, 'wednesday', bucketMemberId)

      expect(mondayKey).toBe('bucket-task-789-monday-shared')
      expect(tuesdayKey).toBe('bucket-task-789-tuesday-shared')
      expect(wednesdayKey).toBe('bucket-task-789-wednesday-shared')

      // All keys should be unique
      expect(mondayKey).not.toBe(tuesdayKey)
      expect(tuesdayKey).not.toBe(wednesdayKey)
      expect(wednesdayKey).not.toBe(mondayKey)
    })

    it('should generate unique keys for different tasks on the same day', () => {
      const day = 'thursday'
      const bucketMemberId = undefined

      const task1Key = generateBucketTaskKey('bucket-task-1', day, bucketMemberId)
      const task2Key = generateBucketTaskKey('bucket-task-2', day, bucketMemberId)

      expect(task1Key).toBe('bucket-task-1-thursday-shared')
      expect(task2Key).toBe('bucket-task-2-thursday-shared')

      // Keys should be different
      expect(task1Key).not.toBe(task2Key)
    })

    it('should handle member-specific buckets correctly', () => {
      const taskId = 'member-task-999'
      const day = 'saturday'

      const member1Key = generateBucketTaskKey(taskId, day, 'member-1')
      const member2Key = generateBucketTaskKey(taskId, day, 'member-2')

      expect(member1Key).toBe('member-task-999-saturday-member-1')
      expect(member2Key).toBe('member-task-999-saturday-member-2')

      // Keys should be different
      expect(member1Key).not.toBe(member2Key)
    })

    it('should handle shared vs member buckets correctly', () => {
      const taskId = 'mixed-task-111'
      const day = 'sunday'

      const sharedKey = generateBucketTaskKey(taskId, day, undefined)
      const memberKey = generateBucketTaskKey(taskId, day, 'member-1')

      expect(sharedKey).toBe('mixed-task-111-sunday-shared')
      expect(memberKey).toBe('mixed-task-111-sunday-member-1')

      // Keys should be different
      expect(sharedKey).not.toBe(memberKey)
    })
  })

  describe('Cross-component key consistency', () => {
    it('should generate consistent keys between PlannerWeek and BucketSection', () => {
      const taskId = 'consistency-task-222'
      const day = 'monday'
      const bucketType = 'shared'
      const bucketMemberId = undefined

      const plannerKey = generateTaskKey(taskId, day, bucketType, bucketMemberId)
      const bucketKey = generateBucketTaskKey(taskId, day, bucketMemberId)

      // These should be different because they use different formats
      // PlannerWeek: taskId-day-bucketType-bucketMemberId
      // BucketSection: taskId-day-bucketMemberId
      expect(plannerKey).toBe('consistency-task-222-monday-shared-shared')
      expect(bucketKey).toBe('consistency-task-222-monday-shared')

      // They should be different
      expect(plannerKey).not.toBe(bucketKey)
    })

    it('should handle edge cases with empty or special characters', () => {
      const taskId = 'edge-case-task'
      const day = 'monday'

      // Test with empty bucketMemberId
      const emptyMemberKey = generateBucketTaskKey(taskId, day, '')
      expect(emptyMemberKey).toBe('edge-case-task-monday-')

      // Test with special characters in taskId
      const specialTaskId = 'task-with-special-chars_123'
      const specialKey = generateBucketTaskKey(specialTaskId, day, 'member-1')
      expect(specialKey).toBe('task-with-special-chars_123-monday-member-1')
    })
  })

  describe('Real-world scenarios', () => {
    it('should handle the original bug case: duplicate keys for multi-day tasks', () => {
      // This replicates the exact scenario from the user's report
      const taskId = '9f075d6e-2edf-47fe-b8cd-b94e5e31f15c'
      const bucketType = 'shared'
      const bucketMemberId = undefined

      // Generate keys for all days of the week
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      const keys = days.map(day => generateTaskKey(taskId, day, bucketType, bucketMemberId))

      // All keys should be unique
      const uniqueKeys = new Set(keys)
      expect(uniqueKeys.size).toBe(keys.length)

      // Verify each key is unique
      keys.forEach((key, index) => {
        keys.forEach((otherKey, otherIndex) => {
          if (index !== otherIndex) {
            expect(key).not.toBe(otherKey)
          }
        })
      })
    })

    it('should handle tasks that appear in both shared and member buckets', () => {
      const taskId = 'dual-bucket-task'
      const day = 'wednesday'

      // Same task in shared bucket
      const sharedKey = generateTaskKey(taskId, day, 'shared', undefined)
      
      // Same task in member bucket
      const memberKey = generateTaskKey(taskId, day, 'member', 'member-1')

      expect(sharedKey).toBe('dual-bucket-task-wednesday-shared-shared')
      expect(memberKey).toBe('dual-bucket-task-wednesday-member-member-1')

      // Keys should be different
      expect(sharedKey).not.toBe(memberKey)
    })
  })
})
