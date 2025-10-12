import { test, expect } from '@playwright/test';

test.describe('Complete Task Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the routine builder
    await page.goto('/dashboard');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="routine-builder"]');
  });

  test('complete journey: create daily task → delete with modal → undo', async ({ page }) => {
    // === PHASE 1: CREATE DAILY RECURRING TASK ===
    
    // 1. Click on Monday column to create task
    await page.click('[data-testid="monday-column"]');
    
    // 2. Fill in task creation form
    await page.fill('[data-testid="task-name-input"]', 'Daily Exercise');
    await page.selectOption('[data-testid="frequency-select"]', 'daily');
    await page.selectOption('[data-testid="time-select"]', 'morning');
    await page.fill('[data-testid="points-input"]', '10');
    
    // 3. Assign to all family members
    await page.click('[data-testid="assign-all-family"]');
    
    // 4. Save task
    await page.click('[data-testid="save-task-button"]');
    
    // 5. Verify task appears on all days
    await expect(page.locator('[data-testid="task-daily-exercise-monday"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-daily-exercise-tuesday"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-daily-exercise-wednesday"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-daily-exercise-thursday"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-daily-exercise-friday"]')).toBeVisible();
    
    // === PHASE 2: DELETE WITH RECURRING MODAL ===
    
    // 6. Click on Tuesday's task to open mini popup
    await page.click('[data-testid="task-daily-exercise-tuesday"]');
    
    // 7. Verify mini popup appears with task details
    await expect(page.locator('[data-testid="task-mini-popup"]')).toBeVisible();
    await expect(page.locator('text=Daily Exercise')).toBeVisible();
    await expect(page.locator('text=Tuesday')).toBeVisible();
    await expect(page.locator('text=Daily')).toBeVisible();
    
    // 8. Click delete button
    await page.click('[data-testid="delete-task-button"]');
    
    // 9. Verify recurring deletion modal appears
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).toBeVisible();
    await expect(page.locator('text=Delete recurring event')).toBeVisible();
    
    // 10. Verify all deletion options are available
    await expect(page.locator('text=This event only')).toBeVisible();
    await expect(page.locator('text=This and following events')).toBeVisible();
    await expect(page.locator('text=All events')).toBeVisible();
    
    // 11. Select "This and following events"
    await page.click('input[value="this_and_following"]');
    
    // 12. Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');
    
    // 13. Verify modal closes
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).not.toBeVisible();
    
    // 14. Verify correct tasks are deleted (Tuesday onwards)
    await expect(page.locator('[data-testid="task-daily-exercise-monday"]')).toBeVisible(); // Should remain
    await expect(page.locator('[data-testid="task-daily-exercise-tuesday"]')).not.toBeVisible(); // Deleted
    await expect(page.locator('[data-testid="task-daily-exercise-wednesday"]')).not.toBeVisible(); // Deleted
    await expect(page.locator('[data-testid="task-daily-exercise-thursday"]')).not.toBeVisible(); // Deleted
    await expect(page.locator('[data-testid="task-daily-exercise-friday"]')).not.toBeVisible(); // Deleted
    
    // 15. Verify undo toast appears
    await expect(page.locator('text=Task deleted (this and following)')).toBeVisible();
    
    // === PHASE 3: TEST UNDO FUNCTIONALITY ===
    
    // 16. Click undo button
    await page.click('[data-testid="undo-button"]');
    
    // 17. Verify all tasks are restored
    await expect(page.locator('[data-testid="task-daily-exercise-monday"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-daily-exercise-tuesday"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-daily-exercise-wednesday"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-daily-exercise-thursday"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-daily-exercise-friday"]')).toBeVisible();
    
    // 18. Verify undo toast disappears
    await expect(page.locator('text=Task deleted (this and following)')).not.toBeVisible();
  });

  test('compare recurring vs individual task deletion behavior', async ({ page }) => {
    // === CREATE BOTH TASK TYPES ===
    
    // Create daily recurring task
    await createTask(page, 'Daily Task', 'daily');
    await expect(page.locator('[data-testid="task-daily-task-monday"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-daily-task-tuesday"]')).toBeVisible();
    
    // Create individual task
    await createTask(page, 'One-time Task', 'specific_days');
    await expect(page.locator('[data-testid="task-one-time-task-monday"]')).toBeVisible();
    
    // === TEST RECURRING TASK DELETION ===
    
    // Click on recurring task
    await page.click('[data-testid="task-daily-task-monday"]');
    await page.click('[data-testid="delete-task-button"]');
    
    // Should show modal
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).toBeVisible();
    
    // Cancel the modal
    await page.click('[data-testid="cancel-delete-button"]');
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).not.toBeVisible();
    
    // === TEST INDIVIDUAL TASK DELETION ===
    
    // Click on individual task
    await page.click('[data-testid="task-one-time-task-monday"]');
    await page.click('[data-testid="delete-task-button"]');
    
    // Should NOT show modal, should delete immediately
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="task-one-time-task-monday"]')).not.toBeVisible();
    
    // Should show immediate deletion toast
    await expect(page.locator('text=Task deleted')).toBeVisible();
  });

  test('verify backend integration with frontend behavior', async ({ page }) => {
    // This test verifies that the frontend behavior matches backend expectations
    
    // 1. Create a daily task
    await createTask(page, 'Backend Test Task', 'daily');
    
    // 2. Delete with "All events"
    await page.click('[data-testid="task-backend-test-task-monday"]');
    await page.click('[data-testid="delete-task-button"]');
    await page.click('input[value="all_days"]');
    await page.click('[data-testid="confirm-delete-button"]');
    
    // 3. Verify all instances are gone
    await expect(page.locator('[data-testid="task-backend-test-task-monday"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="task-backend-test-task-tuesday"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="task-backend-test-task-wednesday"]')).not.toBeVisible();
    
    // 4. Refresh page to verify backend persistence
    await page.reload();
    await page.waitForSelector('[data-testid="routine-builder"]');
    
    // 5. Verify tasks are still deleted (backend persisted the deletion)
    await expect(page.locator('[data-testid="task-backend-test-task-monday"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="task-backend-test-task-tuesday"]')).not.toBeVisible();
  });

  // Helper function to create tasks
  async function createTask(page: any, taskName: string, frequency: string) {
    await page.click('[data-testid="monday-column"]');
    await page.fill('[data-testid="task-name-input"]', taskName);
    await page.selectOption('[data-testid="frequency-select"]', frequency);
    await page.click('[data-testid="assign-all-family"]');
    await page.click('[data-testid="save-task-button"]');
    
    // Wait for task to appear
    const testId = taskName.toLowerCase().replace(/\s+/g, '-');
    await page.waitForSelector(`[data-testid="task-${testId}-monday"]`);
  }
});
