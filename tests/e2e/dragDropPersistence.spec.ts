/**
 * E2E test for drag-and-drop task persistence
 * 
 * This test will initially FAIL due to the duplicate bug.
 * After fixing the bug, it should PASS.
 */

import { test, expect, type Page } from '@playwright/test';

// Helper to login (you may need to adjust based on your auth flow)
async function login(page: Page) {
  // TODO: Replace with your actual login flow
  // For now, we'll assume you have a test user or mock auth
  await page.goto('/signin');
  
  // Example login flow (adjust to your app):
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard or home
  await page.waitForURL(/dashboard|onboarding/, { timeout: 10000 });
}

test.describe('Drag and Drop Task Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login before each test
    await login(page);
  });

  test('dragging task from Monday to Tuesday should not create duplicates', async ({ page }) => {
    // Navigate to routine builder
    await page.goto('/onboarding/routine-builder');
    
    // Wait for the routine builder to load
    await page.waitForSelector('[data-testid="routine-builder"]', { timeout: 10000 });
    
    // Create a new task on Monday
    // 1. Click on Monday column to create a task
    const mondayColumn = page.locator('[data-testid="day-column-monday"]');
    await mondayColumn.click();
    
    // 2. Fill in task details (adjust selectors based on your UI)
    await page.fill('input[name="taskName"]', 'Brush Teeth');
    await page.fill('input[name="points"]', '5');
    await page.selectOption('select[name="timeOfDay"]', 'morning');
    
    // 3. Select "Just this day" for frequency
    await page.selectOption('select[name="frequency"]', 'just_this_day');
    
    // 4. Save the task
    await page.click('button:has-text("Save")');
    
    // Wait for task to appear in Monday column
    const mondayTask = page.locator('[data-testid="task-item"]', { hasText: 'Brush Teeth' });
    await expect(mondayTask).toBeVisible();
    
    // Count tasks in Monday - should be 1
    const mondayTasks = page.locator('[data-testid="day-column-monday"] [data-testid="task-item"]');
    await expect(mondayTasks).toHaveCount(1);
    
    console.log('✅ Task created in Monday column');
    
    // ACT: Drag the task from Monday to Tuesday
    const tuesdayColumn = page.locator('[data-testid="day-column-tuesday"]');
    
    // Perform drag and drop
    await mondayTask.dragTo(tuesdayColumn);
    
    // Wait for any animations/state updates
    await page.waitForTimeout(1000);
    
    console.log('🎯 Task dragged from Monday to Tuesday');
    
    // ASSERT: Task should be in Tuesday column
    const tuesdayTasks = page.locator('[data-testid="day-column-tuesday"] [data-testid="task-item"]', { 
      hasText: 'Brush Teeth' 
    });
    await expect(tuesdayTasks).toBeVisible();
    
    // ASSERT: Task should NOT be in Monday column anymore
    const mondayTasksAfterDrag = page.locator('[data-testid="day-column-monday"] [data-testid="task-item"]', {
      hasText: 'Brush Teeth'
    });
    await expect(mondayTasksAfterDrag).toHaveCount(0);
    
    console.log('🔍 Checking for duplicates...');
    
    // ASSERT: Count total tasks with name "Brush Teeth" across all columns
    const allBrushTeethTasks = page.locator('[data-testid="task-item"]', { hasText: 'Brush Teeth' });
    const count = await allBrushTeethTasks.count();
    
    console.log(`📊 Found ${count} task(s) named "Brush Teeth"`);
    
    // THIS IS THE CRITICAL ASSERTION - will fail if there are duplicates
    expect(count).toBe(1);
    
    // ACT: Refresh the page to verify persistence
    await page.reload();
    await page.waitForSelector('[data-testid="routine-builder"]', { timeout: 10000 });
    
    console.log('🔄 Page refreshed');
    
    // ASSERT: After refresh, task should still be in Tuesday only
    const tuesdayTasksAfterRefresh = page.locator('[data-testid="day-column-tuesday"] [data-testid="task-item"]', {
      hasText: 'Brush Teeth'
    });
    await expect(tuesdayTasksAfterRefresh).toHaveCount(1);
    
    // ASSERT: After refresh, task should NOT be in Monday
    const mondayTasksAfterRefresh = page.locator('[data-testid="day-column-monday"] [data-testid="task-item"]', {
      hasText: 'Brush Teeth'
    });
    await expect(mondayTasksAfterRefresh).toHaveCount(0);
    
    // ASSERT: Still only 1 task total after refresh
    const allTasksAfterRefresh = page.locator('[data-testid="task-item"]', { hasText: 'Brush Teeth' });
    await expect(allTasksAfterRefresh).toHaveCount(1);
    
    console.log('✅ TEST PASSED: Task persisted correctly in Tuesday without duplicates!');
  });

  test('dragging multi-day task to new day should add the day', async ({ page }) => {
    await page.goto('/onboarding/routine-builder');
    await page.waitForSelector('[data-testid="routine-builder"]');
    
    // Create a task on Monday and Wednesday
    const mondayColumn = page.locator('[data-testid="day-column-monday"]');
    await mondayColumn.click();
    
    await page.fill('input[name="taskName"]', 'Read Book');
    await page.fill('input[name="points"]', '10');
    
    // Select "Specific days" and choose Monday + Wednesday
    await page.selectOption('select[name="frequency"]', 'specific_days');
    await page.check('input[value="monday"]');
    await page.check('input[value="wednesday"]');
    
    await page.click('button:has-text("Save")');
    
    // Verify task appears in both Monday and Wednesday
    await expect(page.locator('[data-testid="day-column-monday"] [data-testid="task-item"]', { 
      hasText: 'Read Book' 
    })).toBeVisible();
    await expect(page.locator('[data-testid="day-column-wednesday"] [data-testid="task-item"]', { 
      hasText: 'Read Book' 
    })).toBeVisible();
    
    // ACT: Drag from Monday to Tuesday (should ADD Tuesday to the list)
    const mondayTask = page.locator('[data-testid="day-column-monday"] [data-testid="task-item"]', {
      hasText: 'Read Book'
    });
    const tuesdayColumn = page.locator('[data-testid="day-column-tuesday"]');
    await mondayTask.dragTo(tuesdayColumn);
    await page.waitForTimeout(1000);
    
    // ASSERT: Task should now appear in Monday, Tuesday, AND Wednesday
    await expect(page.locator('[data-testid="day-column-monday"] [data-testid="task-item"]', { 
      hasText: 'Read Book' 
    })).toBeVisible();
    await expect(page.locator('[data-testid="day-column-tuesday"] [data-testid="task-item"]', { 
      hasText: 'Read Book' 
    })).toBeVisible();
    await expect(page.locator('[data-testid="day-column-wednesday"] [data-testid="task-item"]', { 
      hasText: 'Read Book' 
    })).toBeVisible();
    
    // Verify exactly 3 instances (one per day)
    const allReadBookTasks = page.locator('[data-testid="task-item"]', { hasText: 'Read Book' });
    await expect(allReadBookTasks).toHaveCount(3);
    
    console.log('✅ Multi-day task correctly expanded from 2 to 3 days');
  });
});

