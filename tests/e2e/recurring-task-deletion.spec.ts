import { test, expect } from '@playwright/test';

test.describe('Recurring Task Deletion', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the routine builder
    await page.goto('/dashboard');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="routine-builder"]');
  });

  test('should show deletion modal for daily recurring task', async ({ page }) => {
    // 1. Create a daily recurring task
    await createDailyRecurringTask(page, 'Brush Teeth');
    
    // 2. Click on the task to open mini popup
    await page.click('[data-testid="task-brush-teeth"]');
    
    // 3. Click delete button
    await page.click('[data-testid="delete-task-button"]');
    
    // 4. Verify the deletion modal appears
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).toBeVisible();
    
    // 5. Verify the modal has the correct title
    await expect(page.locator('text=Delete recurring event')).toBeVisible();
    
    // 6. Verify all three deletion options are present
    await expect(page.locator('text=This event only')).toBeVisible();
    await expect(page.locator('text=This and following events')).toBeVisible();
    await expect(page.locator('text=All events')).toBeVisible();
    
    // 7. Verify default selection is "This event only"
    await expect(page.locator('input[value="this_day"]')).toBeChecked();
  });

  test('should delete only this event when "This event only" is selected', async ({ page }) => {
    // 1. Create a daily recurring task
    await createDailyRecurringTask(page, 'Brush Teeth');
    
    // 2. Verify task exists on multiple days
    await expect(page.locator('[data-testid="task-brush-teeth-monday"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-brush-teeth-tuesday"]')).toBeVisible();
    
    // 3. Click on Monday's task and delete with "This event only"
    await page.click('[data-testid="task-brush-teeth-monday"]');
    await page.click('[data-testid="delete-task-button"]');
    
    // 4. Select "This event only" (should be default)
    await page.click('input[value="this_day"]');
    await page.click('[data-testid="confirm-delete-button"]');
    
    // 5. Verify only Monday's task is deleted
    await expect(page.locator('[data-testid="task-brush-teeth-monday"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="task-brush-teeth-tuesday"]')).toBeVisible();
    
    // 6. Verify undo toast appears
    await expect(page.locator('text=Task deleted')).toBeVisible();
  });

  test('should delete all events when "All events" is selected', async ({ page }) => {
    // 1. Create a daily recurring task
    await createDailyRecurringTask(page, 'Brush Teeth');
    
    // 2. Verify task exists on multiple days
    await expect(page.locator('[data-testid="task-brush-teeth-monday"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-brush-teeth-tuesday"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-brush-teeth-wednesday"]')).toBeVisible();
    
    // 3. Click on any task and delete with "All events"
    await page.click('[data-testid="task-brush-teeth-monday"]');
    await page.click('[data-testid="delete-task-button"]');
    
    // 4. Select "All events"
    await page.click('input[value="all_days"]');
    await page.click('[data-testid="confirm-delete-button"]');
    
    // 5. Verify all instances are deleted
    await expect(page.locator('[data-testid="task-brush-teeth-monday"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="task-brush-teeth-tuesday"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="task-brush-teeth-wednesday"]')).not.toBeVisible();
    
    // 6. Verify undo toast appears
    await expect(page.locator('text=Task deleted (all days)')).toBeVisible();
  });

  test('should delete this and following events when selected', async ({ page }) => {
    // 1. Create a daily recurring task
    await createDailyRecurringTask(page, 'Brush Teeth');
    
    // 2. Click on Tuesday's task and delete with "This and following events"
    await page.click('[data-testid="task-brush-teeth-tuesday"]');
    await page.click('[data-testid="delete-task-button"]');
    
    // 3. Select "This and following events"
    await page.click('input[value="this_and_following"]');
    await page.click('[data-testid="confirm-delete-button"]');
    
    // 4. Verify Monday remains but Tuesday onwards are deleted
    await expect(page.locator('[data-testid="task-brush-teeth-monday"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-brush-teeth-tuesday"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="task-brush-teeth-wednesday"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="task-brush-teeth-thursday"]')).not.toBeVisible();
  });

  test('should not show deletion modal for individual tasks', async ({ page }) => {
    // 1. Create an individual task (not recurring)
    await createIndividualTask(page, 'One-time Task');
    
    // 2. Click on the task
    await page.click('[data-testid="task-one-time-task"]');
    
    // 3. Click delete button
    await page.click('[data-testid="delete-task-button"]');
    
    // 4. Verify the deletion modal does NOT appear
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).not.toBeVisible();
    
    // 5. Verify task is deleted immediately with toast
    await expect(page.locator('[data-testid="task-one-time-task"]')).not.toBeVisible();
    await expect(page.locator('text=Task deleted')).toBeVisible();
  });

  test('should allow canceling deletion modal', async ({ page }) => {
    // 1. Create a daily recurring task
    await createDailyRecurringTask(page, 'Brush Teeth');
    
    // 2. Click on task and delete
    await page.click('[data-testid="task-brush-teeth-monday"]');
    await page.click('[data-testid="delete-task-button"]');
    
    // 3. Verify modal appears
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).toBeVisible();
    
    // 4. Click cancel
    await page.click('[data-testid="cancel-delete-button"]');
    
    // 5. Verify modal disappears and task still exists
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="task-brush-teeth-monday"]')).toBeVisible();
  });

  test('should work with undo functionality', async ({ page }) => {
    // 1. Create a daily recurring task
    await createDailyRecurringTask(page, 'Brush Teeth');
    
    // 2. Delete with "This event only"
    await page.click('[data-testid="task-brush-teeth-monday"]');
    await page.click('[data-testid="delete-task-button"]');
    await page.click('[data-testid="confirm-delete-button"]');
    
    // 3. Verify task is deleted
    await expect(page.locator('[data-testid="task-brush-teeth-monday"]')).not.toBeVisible();
    
    // 4. Click undo
    await page.click('[data-testid="undo-button"]');
    
    // 5. Verify task is restored
    await expect(page.locator('[data-testid="task-brush-teeth-monday"]')).toBeVisible();
  });

  // Helper functions
  async function createDailyRecurringTask(page: any, taskName: string) {
    // Click on Monday column to create task
    await page.click('[data-testid="monday-column"]');
    
    // Fill in task details
    await page.fill('[data-testid="task-name-input"]', taskName);
    await page.selectOption('[data-testid="frequency-select"]', 'daily');
    await page.click('[data-testid="assign-all-family"]');
    
    // Save task
    await page.click('[data-testid="save-task-button"]');
    
    // Wait for task to appear
    await page.waitForSelector(`[data-testid="task-${taskName.toLowerCase().replace(/\s+/g, '-')}"]`);
  }

  async function createIndividualTask(page: any, taskName: string) {
    // Click on Monday column to create task
    await page.click('[data-testid="monday-column"]');
    
    // Fill in task details for single day
    await page.fill('[data-testid="task-name-input"]', taskName);
    await page.selectOption('[data-testid="frequency-select"]', 'specific_days');
    await page.click('[data-testid="assign-all-family"]');
    
    // Save task
    await page.click('[data-testid="save-task-button"]');
    
    // Wait for task to appear
    await page.waitForSelector(`[data-testid="task-${taskName.toLowerCase().replace(/\s+/g, '-')}"]`);
  }
});
