/**
 * Database cleanup utilities for E2E tests
 * Provides automatic cleanup of test data created during E2E tests
 */

import { Page } from '@playwright/test';

export interface TestResourceTracker {
  families: string[];
  members: string[];
  routines: string[];
  tasks: string[];
}

export class E2EDatabaseCleanup {
  private tracker: TestResourceTracker = {
    families: [],
    members: [],
    routines: [],
    tasks: []
  };

  /**
   * Track a family for cleanup
   */
  addFamily(familyId: string) {
    this.tracker.families.push(familyId);
  }

  /**
   * Track a member for cleanup
   */
  addMember(memberId: string) {
    this.tracker.members.push(memberId);
  }

  /**
   * Track a routine for cleanup
   */
  addRoutine(routineId: string) {
    this.tracker.routines.push(routineId);
  }

  /**
   * Track a task for cleanup
   */
  addTask(taskId: string) {
    this.tracker.tasks.push(taskId);
  }

  /**
   * Clean up all tracked resources via API calls
   * This is safer than direct database access for E2E tests
   */
  async cleanupAll(page: Page) {
    try {
      // Clean up in reverse dependency order
      
      // 1. Clean up tasks first (if any)
      for (const taskId of this.tracker.tasks) {
        try {
          await page.request.delete(`/api/routines/tasks/${taskId}`);
        } catch (e) {
          console.warn(`Failed to cleanup task ${taskId}:`, e);
        }
      }

      // 2. Clean up routines
      for (const routineId of this.tracker.routines) {
        try {
          await page.request.delete(`/api/routines/${routineId}`);
        } catch (e) {
          console.warn(`Failed to cleanup routine ${routineId}:`, e);
        }
      }

      // 3. Clean up members
      for (const memberId of this.tracker.members) {
        try {
          await page.request.delete(`/api/families/members/${memberId}`);
        } catch (e) {
          console.warn(`Failed to cleanup member ${memberId}:`, e);
        }
      }

      // 4. Clean up families (this will cascade delete members)
      for (const familyId of this.tracker.families) {
        try {
          await page.request.delete(`/api/families/${familyId}`);
        } catch (e) {
          console.warn(`Failed to cleanup family ${familyId}:`, e);
        }
      }

      const total = this.tracker.families.length + this.tracker.routines.length + 
                   this.tracker.tasks.length + this.tracker.members.length;
      
      if (total > 0) {
        console.log(`🧹 Cleaned up: ${this.tracker.families.length} families, ${this.tracker.routines.length} routines, ${this.tracker.tasks.length} tasks, ${this.tracker.members.length} members`);
      }

      // Reset tracker
      this.tracker = { families: [], members: [], routines: [], tasks: [] };
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Get current tracker state (for debugging)
   */
  getTracker() {
    return { ...this.tracker };
  }
}

/**
 * Helper function to create a cleanup tracker for a test
 */
export function createCleanupTracker(): E2EDatabaseCleanup {
  return new E2EDatabaseCleanup();
}

/**
 * Helper function to extract family ID from API response
 */
export function extractFamilyId(response: any): string | null {
  if (response && response.id) {
    return response.id;
  }
  if (response && response.family_id) {
    return response.family_id;
  }
  return null;
}

/**
 * Helper function to extract member ID from API response
 */
export function extractMemberId(response: any): string | null {
  if (response && response.id) {
    return response.id;
  }
  if (response && response.member_id) {
    return response.member_id;
  }
  return null;
}

/**
 * Helper function to extract routine ID from API response
 */
export function extractRoutineId(response: any): string | null {
  if (response && response.id) {
    return response.id;
  }
  if (response && response.routine_id) {
    return response.routine_id;
  }
  return null;
}

/**
 * Helper function to extract task ID from API response
 */
export function extractTaskId(response: any): string | null {
  if (response && response.id) {
    return response.id;
  }
  if (response && response.task_id) {
    return response.task_id;
  }
  return null;
}
