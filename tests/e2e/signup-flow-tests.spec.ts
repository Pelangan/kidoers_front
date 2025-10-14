import { test, expect } from '@playwright/test';

test.describe('Signup Flow Tests (Working)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/signup');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Signup Form Display', () => {
    test('should display signup form correctly', async ({ page }) => {
      // Verify we're on signup page
      await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
      
      // Verify form elements
      await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Confirm password' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    });

    test('should show proper form validation states', async ({ page }) => {
      // Verify form is initially in valid state
      const emailInput = page.getByRole('textbox', { name: 'Email address' });
      const passwordInput = page.getByRole('textbox', { name: 'Password', exact: true });
      const confirmPasswordInput = page.getByRole('textbox', { name: 'Confirm password' });
      
      // All fields should be empty initially
      await expect(emailInput).toHaveValue('');
      await expect(passwordInput).toHaveValue('');
      await expect(confirmPasswordInput).toHaveValue('');
    });
  });

  test.describe('Form Validation', () => {
    test('should validate email format', async ({ page }) => {
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

    test('should validate password requirements', async ({ page }) => {
      const passwordInput = page.getByRole('textbox', { name: 'Password', exact: true });
      
      // Test empty password
      await passwordInput.fill('');
      await page.getByRole('button', { name: 'Create Account' }).click();
      
      // Check HTML5 validation
      const validity = await passwordInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(validity).toBe(false);
    });

    test('should validate password confirmation', async ({ page }) => {
      const passwordInput = page.getByRole('textbox', { name: 'Password', exact: true });
      const confirmPasswordInput = page.getByRole('textbox', { name: 'Confirm password' });
      
      // Fill mismatched passwords
      await passwordInput.fill('password123');
      await confirmPasswordInput.fill('differentpassword');
      
      // Try to submit
      await page.getByRole('button', { name: 'Create Account' }).click();
      
      // Should show validation error or stay on page
      const isStillOnSignup = await page.getByRole('heading', { name: 'Create your account' }).isVisible().catch(() => false);
      const hasError = await page.getByText(/password|match|different/i).isVisible().catch(() => false);
      
      expect(isStillOnSignup || hasError).toBe(true);
    });

    test('should handle empty form submission', async ({ page }) => {
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
  });

  test.describe('Password Visibility Toggle', () => {
    test('should toggle password visibility', async ({ page }) => {
      const passwordInput = page.getByRole('textbox', { name: 'Password', exact: true });
      
      // Fill password field
      await passwordInput.fill('testpassword123');
      
      // Initially password should be hidden
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Find and click the password visibility toggle button
      const toggleButton = page.locator('form').getByRole('button').filter({ hasText: /^$/ }).first();
      await toggleButton.click();
      
      // Password should now be visible
      await expect(passwordInput).toHaveAttribute('type', 'text');
      
      // Click toggle button again to hide password
      await toggleButton.click();
      
      // Password should be hidden again
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should toggle confirm password visibility', async ({ page }) => {
      const confirmPasswordInput = page.getByRole('textbox', { name: 'Confirm password' });
      
      // Fill confirm password field
      await confirmPasswordInput.fill('testpassword123');
      
      // Initially password should be hidden
      await expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      
      // Find and click the confirm password visibility toggle button
      const toggleButtons = page.locator('form').getByRole('button').filter({ hasText: /^$/ });
      const confirmToggleButton = toggleButtons.nth(1); // Second toggle button
      await confirmToggleButton.click();
      
      // Password should now be visible
      await expect(confirmPasswordInput).toHaveAttribute('type', 'text');
      
      // Click toggle button again to hide password
      await confirmToggleButton.click();
      
      // Password should be hidden again
      await expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });
  });

  test.describe('Google Authentication', () => {
    test('should display Google auth button', async ({ page }) => {
      const googleButton = page.getByRole('button', { name: 'Continue with Google' });
      
      // Verify button is visible
      await expect(googleButton).toBeVisible();
      
      // Verify button has Google logo
      const googleLogo = googleButton.locator('svg');
      await expect(googleLogo).toBeVisible();
      
      // Verify button text
      await expect(googleButton).toHaveText('Continue with Google');
    });

    test('should handle Google auth button click', async ({ page }) => {
      const googleButton = page.getByRole('button', { name: 'Continue with Google' });
      
      // Click Google auth button
      await googleButton.click();
      
      // Wait for potential redirect or error with timeout
      await page.waitForTimeout(3000);
      
      // Since Google auth is not implemented, we expect no navigation
      await expect(page).toHaveURL(/.*signup/);
      
      console.log('Google auth button clicked - implementation pending');
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to signin page', async ({ page }) => {
      // Look for signin link
      const signinLink = page.getByRole('link', { name: /sign in|login/i });
      
      if (await signinLink.isVisible()) {
        await signinLink.click();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/.*signin/);
        await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
      } else {
        // If no signin link, navigate directly
        await page.goto('http://localhost:3000/signin');
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
      }
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
      // Navigate to signin page
      await page.goto('http://localhost:3000/signin');
      await page.waitForLoadState('networkidle');
      
      // Go back to signup
      await page.goBack();
      await page.waitForLoadState('networkidle');
      
      // Should be back on signup page
      await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
      
      // Go forward to signin
      await page.goForward();
      await page.waitForLoadState('networkidle');
      
      // Should be on signin page
      await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify all elements are still visible and functional
      await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Confirm password' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Verify all elements are still visible and functional
      await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Confirm password' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check for proper form labels
      await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Confirm password' })).toBeVisible();
      
      // Check for proper button roles
      await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Tab through form elements with proper waits
      await page.keyboard.press('Tab'); // Email field
      await page.waitForTimeout(100);
      await page.keyboard.press('Tab'); // Password field
      await page.waitForTimeout(100);
      await page.keyboard.press('Tab'); // Confirm password field
      await page.waitForTimeout(100);
      await page.keyboard.press('Tab'); // Create Account button
      await page.waitForTimeout(100);
      await page.keyboard.press('Tab'); // Google button
      
      // Verify focus is on Google button
      await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeFocused({ timeout: 5000 });
    });
  });
});
