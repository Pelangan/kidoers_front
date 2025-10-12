import { test, expect } from '@playwright/test';

// Helper to login with test user
async function login(page: any) {
  console.log('Attempting to login...');
  
  // Go to signin page
  await page.goto('/signin');
  
  // Wait for the signin form to load
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  
  // Fill in credentials
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'testpassword123');
  
  // Click sign in button
  await page.click('button:has-text("Sign In")');
  
  // Wait for navigation (either to dashboard or onboarding)
  await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });
  
  console.log('Login completed, current URL:', page.url());
}

test.describe('Debug E2E Tests', () => {
  test('should load the homepage', async ({ page }) => {
    // Just try to load the homepage
    await page.goto('/');
    
    // Take a screenshot to see what we get
    await page.screenshot({ path: 'debug-homepage.png' });
    
    // Log the page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Log the current URL
    console.log('Current URL:', page.url());
    
    // Check if we're redirected to login
    if (page.url().includes('/signin')) {
      console.log('Redirected to signin page');
      
      // Take screenshot of signin page
      await page.screenshot({ path: 'debug-signin.png' });
      
      // Check if there are email/password inputs
      const emailInput = await page.locator('input[name="email"]').count();
      const passwordInput = await page.locator('input[name="password"]').count();
      
      console.log('Email inputs found:', emailInput);
      console.log('Password inputs found:', passwordInput);
    }
  });

  test('should load the dashboard', async ({ page }) => {
    // Try to go directly to dashboard
    await page.goto('/dashboard');
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-dashboard.png' });
    
    // Log the current URL
    console.log('Dashboard URL:', page.url());
    
    // Check if we're redirected
    if (page.url().includes('/signin')) {
      console.log('Dashboard redirected to signin');
    } else {
      console.log('Dashboard loaded successfully');
      
      // Look for routine builder (should be 0 initially since we're on chores view)
      const routineBuilder = await page.locator('[data-testid="routine-builder"]').count();
      console.log('Routine builder elements found (should be 0):', routineBuilder);
      
      // Look for sidebar navigation
      const sidebarItems = await page.locator('[role="button"], button, a').count();
      console.log('Clickable elements found:', sidebarItems);
      
      // Try to find routine builder link in sidebar
      const routineBuilderLink = await page.locator('text=routine-builder, text=Routine Builder, text=Builder').count();
      console.log('Routine builder links found:', routineBuilderLink);
    }
  });

  test('should navigate to routine builder via Edit button', async ({ page }) => {
    // Go to dashboard
    await page.goto('/dashboard');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot before navigation
    await page.screenshot({ path: 'debug-before-navigation.png' });
    
    // Look for the Edit button in ChoresView
    const editButton = page.locator('button:has-text("Edit")');
    const editButtonCount = await editButton.count();
    
    console.log('Edit buttons found:', editButtonCount);
    
    if (editButtonCount > 0) {
      console.log('Found Edit button, clicking it...');
      await editButton.first().click();
      
      // Wait a bit for navigation
      await page.waitForTimeout(2000);
      
      // Take screenshot after navigation
      await page.screenshot({ path: 'debug-after-edit-click.png' });
      
      // Check if routine builder is now visible
      const routineBuilder = await page.locator('[data-testid="routine-builder"]').count();
      console.log('Routine builder elements found after Edit click:', routineBuilder);
      
      if (routineBuilder > 0) {
        console.log('SUCCESS: Routine builder is now visible!');
      } else {
        console.log('FAILED: Routine builder still not visible after Edit click');
        
        // Let's see what's on the page now
        const currentUrl = page.url();
        console.log('Current URL after Edit click:', currentUrl);
        
        const pageText = await page.textContent('body');
        console.log('Page contains "routine-builder":', pageText?.toLowerCase().includes('routine-builder'));
      }
    } else {
      console.log('Could not find Edit button');
      
      // Let's see what's actually on the page
      const allText = await page.textContent('body');
      console.log('Page text contains "Edit":', allText?.toLowerCase().includes('edit'));
      console.log('Page text contains "Family":', allText?.toLowerCase().includes('family'));
      
      // Look for any buttons
      const allButtons = await page.locator('button').count();
      console.log('Total buttons found:', allButtons);
      
      // List button texts
      const buttonTexts = await page.locator('button').allTextContents();
      console.log('Button texts:', buttonTexts);
    }
  });

  test('should login and access dashboard with routine builder', async ({ page }) => {
    // First, try to login
    await login(page);
    
    // Take screenshot after login
    await page.screenshot({ path: 'debug-after-login.png' });
    
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    if (currentUrl.includes('/onboarding')) {
      console.log('Redirected to onboarding - need to complete setup first');
      // For now, just take a screenshot and note this
      return;
    }
    
    if (currentUrl.includes('/dashboard')) {
      console.log('Successfully on dashboard after login');
      
      // Wait for the page to fully load
      await page.waitForLoadState('networkidle');
      
      // Look for the Edit button
      const editButton = page.locator('button:has-text("Edit")');
      const editButtonCount = await editButton.count();
      
      console.log('Edit buttons found after login:', editButtonCount);
      
      if (editButtonCount > 0) {
        console.log('Found Edit button, clicking it...');
        await editButton.first().click();
        
        // Wait for routine builder to load
        await page.waitForTimeout(2000);
        
        // Check if routine builder is now visible
        const routineBuilder = await page.locator('[data-testid="routine-builder"]').count();
        console.log('Routine builder elements found after Edit click:', routineBuilder);
        
        if (routineBuilder > 0) {
          console.log('SUCCESS: Routine builder is now visible!');
          await page.screenshot({ path: 'debug-routine-builder-success.png' });
        } else {
          console.log('FAILED: Routine builder still not visible after Edit click');
          await page.screenshot({ path: 'debug-routine-builder-failed.png' });
        }
      } else {
        console.log('No Edit button found on dashboard');
        await page.screenshot({ path: 'debug-no-edit-button.png' });
      }
    } else {
      console.log('Unexpected URL after login:', currentUrl);
      await page.screenshot({ path: 'debug-unexpected-url.png' });
    }
  });
});
