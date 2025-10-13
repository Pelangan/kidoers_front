import { test, expect } from '@playwright/test';

test.describe('Login Flow Tests (MCP Style)', () => {
  test('should navigate to signin page and fill form', async ({ page }) => {
    // Navigate to signin page
    await page.goto('http://localhost:3000/signin');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'login-page-loaded.png' });
    
    // Verify page title
    await expect(page).toHaveTitle('Kidoers - Family Task Management');
    
    // Verify signin form elements are present
    await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    
    // Fill in test credentials
    await page.getByRole('textbox', { name: 'Email address' }).fill('test@example.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('testpassword123');
    
    // Take screenshot after filling form
    await page.screenshot({ path: 'login-form-filled.png' });
    
    // Click sign in button
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Take screenshot after clicking
    await page.screenshot({ path: 'login-after-click.png' });
    
    // Verify error message appears (since test user doesn't exist)
    await expect(page.getByText('Invalid login credentials')).toBeVisible();
  });

  test('should navigate to signup page and test form validation', async ({ page }) => {
    // Navigate to signup page
    await page.goto('http://localhost:3000/signup');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'signup-page-loaded.png' });
    
    // Verify signup form elements
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Confirm password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    
    // Fill form with test data
    await page.getByRole('textbox', { name: 'Email address' }).fill('test@example.com');
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill('testpassword123');
    await page.getByRole('textbox', { name: 'Confirm password' }).fill('testpassword123');
    
    // Take screenshot after filling
    await page.screenshot({ path: 'signup-form-filled.png' });
    
    // Click create account
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    // Wait for validation
    await page.waitForTimeout(2000);
    
    // Take screenshot after click
    await page.screenshot({ path: 'signup-after-click.png' });
    
    // Verify validation message
    await expect(page.getByText('Email address "test@example.com" is invalid')).toBeVisible();
  });

  test('should create a new user and test login with email confirmation', async ({ page }) => {
    // First, create a new user via signup
    await page.goto('http://localhost:3000/signup');
    await page.waitForLoadState('networkidle');
    
    // Fill signup form with valid email
    await page.getByRole('textbox', { name: 'Email address' }).fill('testuser@kidoers.com');
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill('testpassword123');
    await page.getByRole('textbox', { name: 'Confirm password' }).fill('testpassword123');
    
    // Click create account
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    // Wait for signup to complete
    await page.waitForTimeout(2000);
    
    // Now test login with the created user
    await page.goto('http://localhost:3000/signin');
    await page.waitForLoadState('networkidle');
    
    // Fill login form
    await page.getByRole('textbox', { name: 'Email address' }).fill('testuser@kidoers.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('testpassword123');
    
    // Click sign in
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Verify we get email confirmation message (expected behavior)
    await expect(page.getByText('Email not confirmed')).toBeVisible();
  });

  test('should navigate between signin and signup pages', async ({ page }) => {
    // Test navigation to signup page
    await page.goto('http://localhost:3000/signin');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on signin page first
    await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
    
    // Navigate directly to signup page
    await page.goto('http://localhost:3000/signup');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on signup page
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    
    // Navigate back to signin page
    await page.goto('http://localhost:3000/signin');
    await page.waitForLoadState('networkidle');
    
    // Verify we're back on signin page
    await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
  });
});
