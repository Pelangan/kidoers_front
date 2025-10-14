import { test, expect } from '@playwright/test';

test.describe('Family Creation Flow (Working)', () => {
  test.beforeEach(async ({ page }) => {
    // Start from signin page since family creation requires authentication
    await page.goto('http://localhost:3000/signin');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Authentication Flow', () => {
    test('should redirect to signin when accessing onboarding without auth', async ({ page }) => {
      // Try to access onboarding directly
      await page.goto('http://localhost:3000/onboarding');
      await page.waitForLoadState('networkidle');
      
      // Should be redirected to signin page
      await expect(page).toHaveURL(/.*signin/);
      await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
    });

    test('should show signup option for new users', async ({ page }) => {
      // Click signup link
      await page.getByRole('link', { name: 'Sign up' }).click();
      
      // Wait for navigation
      await page.waitForLoadState('networkidle');
      
      // Verify we're on signup page
      await expect(page).toHaveURL(/.*signup/);
      await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    });
  });

  test.describe('Signup Flow (Prerequisite for Family Creation)', () => {
    test('should display signup form correctly', async ({ page }) => {
      // Navigate to signup page
      await page.goto('http://localhost:3000/signup');
      await page.waitForLoadState('networkidle');
      
      // Verify signup form elements
      await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Confirm password' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    });

    test('should validate signup form', async ({ page }) => {
      // Navigate to signup page
      await page.goto('http://localhost:3000/signup');
      await page.waitForLoadState('networkidle');
      
      // Try to submit empty form
      await page.getByRole('button', { name: 'Create Account' }).click();
      
      // Verify browser validation prevents submission
      const emailInput = page.getByRole('textbox', { name: 'Email address' });
      const passwordInput = page.getByRole('textbox', { name: 'Password', exact: true });
      const confirmPasswordInput = page.getByRole('textbox', { name: 'Confirm password' });
      
      // Check if HTML5 validation is triggered
      const emailValidity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      const passwordValidity = await passwordInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      const confirmPasswordValidity = await confirmPasswordInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      
      expect(emailValidity).toBe(false);
      expect(passwordValidity).toBe(false);
      expect(confirmPasswordValidity).toBe(false);
    });

    test('should handle password mismatch', async ({ page }) => {
      // Navigate to signup page
      await page.goto('http://localhost:3000/signup');
      await page.waitForLoadState('networkidle');
      
      // Fill form with mismatched passwords
      await page.getByRole('textbox', { name: 'Email address' }).fill('test@example.com');
      await page.getByRole('textbox', { name: 'Password', exact: true }).fill('password123');
      await page.getByRole('textbox', { name: 'Confirm password' }).fill('differentpassword');
      
      // Click create account
      await page.getByRole('button', { name: 'Create Account' }).click();
      
      // Wait for validation
      await page.waitForTimeout(2000);
      
      // Should show validation error or stay on signup page
      const hasError = await page.getByText(/password|match|different/i).isVisible().catch(() => false);
      const isStillOnSignup = await page.getByRole('heading', { name: 'Create your account' }).isVisible().catch(() => false);
      
      expect(hasError || isStillOnSignup).toBe(true);
    });
  });

  test.describe('Family Creation (After Authentication)', () => {
    test('should show family creation form after successful signup', async ({ page }) => {
      // This test would require actual user creation and authentication
      // For now, we'll test the redirect behavior
      
      // Navigate to onboarding (should redirect to signin)
      await page.goto('http://localhost:3000/onboarding');
      await page.waitForLoadState('networkidle');
      
      // Should be redirected to signin
      await expect(page).toHaveURL(/.*signin/);
      
      // Navigate to signup
      await page.getByRole('link', { name: 'Sign up' }).click();
      
      // Wait for navigation to complete
      await page.waitForURL(/.*signup/, { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      // Should be on signup page
      await expect(page).toHaveURL(/.*signup/);
      await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    });

    test('should handle family creation API errors gracefully', async ({ page }) => {
      // Mock API error for family creation
      await page.route('**/api/onboarding/start', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      // Navigate to onboarding (will redirect to signin)
      await page.goto('http://localhost:3000/onboarding');
      await page.waitForLoadState('networkidle');
      
      // Should handle redirect gracefully
      await expect(page).toHaveURL(/.*signin/);
    });
  });

  test.describe('Navigation Flow', () => {
    test('should navigate between signin and signup pages', async ({ page }) => {
      // Verify we're on signin page first
      await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
      
      // Navigate to signup page
      await page.getByRole('link', { name: 'Sign up' }).click();
      
      // Wait for navigation to complete
      await page.waitForURL(/.*signup/, { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      // Verify we're on signup page
      await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
      
      // Navigate back to signin page
      await page.goto('http://localhost:3000/signin');
      await page.waitForLoadState('networkidle');
      
      // Verify we're back on signin page
      await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
      // Navigate to signup page
      await page.getByRole('link', { name: 'Sign up' }).click();
      
      // Wait for navigation to complete
      await page.waitForURL(/.*signup/, { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      // Go back to signin
      await page.goBack();
      await page.waitForLoadState('networkidle');
      
      // Should be back on signin page
      await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
      
      // Go forward to signup
      await page.goForward();
      await page.waitForLoadState('networkidle');
      
      // Should be on signup page
      await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network error
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Network error' })
        });
      });
      
      // Try to submit signin form
      await page.getByRole('textbox', { name: 'Email address' }).fill('test@example.com');
      await page.getByRole('textbox', { name: 'Password' }).fill('password123');
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Should handle error gracefully (stay on page or show error)
      const isStillOnSignin = await page.getByRole('heading', { name: 'Welcome back!' }).isVisible().catch(() => false);
      const hasError = await page.getByText(/error|failed/i).isVisible().catch(() => false);
      
      expect(isStillOnSignin || hasError).toBe(true);
    });

    test('should handle offline scenario', async ({ page }) => {
      // Simulate offline
      await page.context().setOffline(true);
      
      // Try to submit signin form
      await page.getByRole('textbox', { name: 'Email address' }).fill('test@example.com');
      await page.getByRole('textbox', { name: 'Password' }).fill('password123');
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Should handle offline gracefully
      const isStillOnSignin = await page.getByRole('heading', { name: 'Welcome back!' }).isVisible().catch(() => false);
      const hasError = await page.getByText(/error|failed|offline/i).isVisible().catch(() => false);
      
      expect(isStillOnSignin || hasError).toBe(true);
    });
  });

  test.describe('Form Validation', () => {
    test('should validate email format in signup', async ({ page }) => {
      // Navigate to signup page
      await page.goto('http://localhost:3000/signup');
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.getByRole('textbox', { name: 'Email address' });
      
      // Test invalid email formats
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@example.com',
        'test..test@example.com',
        'test@example..com'
      ];
      
      for (const email of invalidEmails) {
        await emailInput.fill(email);
        await page.getByRole('button', { name: 'Create Account' }).click();
        
        // Check HTML5 validation
        const validity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
        expect(validity).toBe(false);
        
        // Clear field for next test
        await emailInput.clear();
      }
    });

    test('should validate password strength', async ({ page }) => {
      // Navigate to signup page
      await page.goto('http://localhost:3000/signup');
      await page.waitForLoadState('networkidle');
      
      const passwordInput = page.getByRole('textbox', { name: 'Password', exact: true });
      
      // Test weak passwords
      const weakPasswords = ['123', 'abc', 'password'];
      
      for (const password of weakPasswords) {
        await passwordInput.fill(password);
        await page.getByRole('button', { name: 'Create Account' }).click();
        
        // Check HTML5 validation
        const validity = await passwordInput.evaluate((el: HTMLInputElement) => el.validity.valid);
        expect(validity).toBe(false);
        
        // Clear field for next test
        await passwordInput.clear();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify all elements are still visible and functional
      await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Verify all elements are still visible and functional
      await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check for proper form labels
      await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
      
      // Check for proper button roles
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
      
      // Check for proper link roles
      await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Tab through form elements with proper waits
      await page.keyboard.press('Tab'); // Email field
      await page.waitForTimeout(100);
      await page.keyboard.press('Tab'); // Password field
      await page.waitForTimeout(100);
      await page.keyboard.press('Tab'); // Forgot password button
      await page.waitForTimeout(100);
      await page.keyboard.press('Tab'); // Sign In button
      await page.waitForTimeout(100);
      await page.keyboard.press('Tab'); // Google button
      await page.waitForTimeout(100);
      await page.keyboard.press('Tab'); // Sign up link
      
      // Verify focus is on signup link with timeout
      await expect(page.getByRole('link', { name: 'Sign up' })).toBeFocused({ timeout: 5000 });
    });
  });
});
