import { test, expect } from '@playwright/test';

test.describe('Family Creation Tests (Fixed)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to signin page first
    await page.goto('http://localhost:3000/signin');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Authentication Required Tests', () => {
    test('should redirect to signin when accessing onboarding without auth', async ({ page }) => {
      // Try to access onboarding directly
      await page.goto('http://localhost:3000/onboarding');
      await page.waitForLoadState('networkidle');
      
      // Should be redirected to signin page
      await expect(page).toHaveURL(/.*signin/);
      await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
    });

    test('should show signup form for new users', async ({ page }) => {
      // Navigate to signup page
      await page.getByRole('link', { name: 'Sign up' }).click();
      await page.waitForLoadState('networkidle');
      
      // Verify we're on signup page
      await expect(page).toHaveURL(/.*signup/);
      await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
      
      // Verify signup form elements
      await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Confirm password' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    });
  });

  test.describe('Login Form Tests', () => {
    test('should display login form correctly', async ({ page }) => {
      // Verify we're on signin page
      await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
      await expect(page.getByText('Sign in to your family account')).toBeVisible();
      
      // Verify form elements
      await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    });

    test('should handle invalid login credentials', async ({ page }) => {
      // Fill in invalid credentials
      await page.getByRole('textbox', { name: 'Email address' }).fill('invalid@example.com');
      await page.getByRole('textbox', { name: 'Password' }).fill('wrongpassword');
      
      // Click sign in button
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Should show error message or stay on signin page
      const hasError = await page.getByText(/invalid|error|failed/i).isVisible().catch(() => false);
      const isStillOnSignin = await page.getByRole('heading', { name: 'Welcome back!' }).isVisible().catch(() => false);
      
      expect(hasError || isStillOnSignin).toBe(true);
    });

    test('should handle empty form submission', async ({ page }) => {
      // Try to submit empty form
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Verify browser validation prevents submission
      const emailInput = page.getByRole('textbox', { name: 'Email address' });
      const passwordInput = page.getByRole('textbox', { name: 'Password' });
      
      // Check if HTML5 validation is triggered
      const emailValidity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      const passwordValidity = await passwordInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      
      expect(emailValidity).toBe(false);
      expect(passwordValidity).toBe(false);
    });
  });

  test.describe('Password Visibility Toggle', () => {
    test('should toggle password visibility', async ({ page }) => {
      const passwordInput = page.getByRole('textbox', { name: 'Password' });
      
      // Fill password field
      await passwordInput.fill('testpassword123');
      
      // Initially password should be hidden
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Find and click the password visibility toggle button
      const toggleButton = page.locator('form').getByRole('button').filter({ hasText: /^$/ });
      await toggleButton.click();
      
      // Password should now be visible
      await expect(passwordInput).toHaveAttribute('type', 'text');
      
      // Click toggle button again to hide password
      await toggleButton.click();
      
      // Password should be hidden again
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  test.describe('Forgot Password Functionality', () => {
    test('should open forgot password modal', async ({ page }) => {
      // Click forgot password button
      await page.getByRole('button', { name: 'Forgot password?' }).click();
      
      // Wait for modal to appear
      await page.waitForTimeout(500);
      
      // Verify modal elements
      await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Enter your email address' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Send Reset Email' })).toBeVisible();
    });

    test('should close forgot password modal with cancel button', async ({ page }) => {
      // Open modal
      await page.getByRole('button', { name: 'Forgot password?' }).click();
      
      // Wait for modal to appear with timeout
      await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible({ timeout: 5000 });
      
      // Click cancel button
      await page.getByRole('button', { name: 'Cancel' }).click();
      
      // Wait for modal to close with timeout
      await expect(page.getByRole('heading', { name: 'Reset Password' })).not.toBeVisible({ timeout: 5000 });
    });

    test('should handle forgot password form submission', async ({ page }) => {
      // Open modal
      await page.getByRole('button', { name: 'Forgot password?' }).click();
      
      // Wait for modal to appear with timeout
      await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible({ timeout: 5000 });
      
      // Fill email field
      await page.getByRole('textbox', { name: 'Enter your email address' }).fill('test@example.com');
      
      // Click send reset email button
      await page.getByRole('button', { name: 'Send Reset Email' }).click();
      
      // Wait for success message with timeout
      await expect(page.getByText(/sent|success|check your inbox/i)).toBeVisible({ timeout: 10000 });
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
      // This test will be updated when Google auth is implemented
      await expect(page).toHaveURL(/.*signin/);
      
      console.log('Google auth button clicked - implementation pending');
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
        await page.getByRole('button', { name: 'Sign In' }).click();
        
        // Check HTML5 validation
        const validity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
        expect(validity).toBe(false);
        
        // Clear field for next test
        await emailInput.clear();
      }
    });

    test('should validate password requirements', async ({ page }) => {
      const passwordInput = page.getByRole('textbox', { name: 'Password' });
      
      // Test empty password
      await passwordInput.fill('');
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Check HTML5 validation
      const validity = await passwordInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(validity).toBe(false);
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
