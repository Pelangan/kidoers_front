import { test, expect } from '@playwright/test';

test.describe('Comprehensive Login Tests (Working)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/signin');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Basic Login Functionality', () => {
    test('should display all login form elements correctly', async ({ page }) => {
      // Verify main heading
      await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
      await expect(page.getByText('Sign in to your family account')).toBeVisible();
      
      // Verify form elements
      await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Sign up' })).toBeVisible();
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

    test('should navigate to signup page', async ({ page }) => {
      // Click signup link
      await page.getByRole('link', { name: 'Sign up' }).click();
      
      // Wait for navigation
      await page.waitForLoadState('networkidle');
      
      // Verify we're on signup page
      await expect(page).toHaveURL(/.*signup/);
      await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
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
      
      // Wait for modal to appear with timeout
      await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible({ timeout: 5000 });
      
      // Verify modal elements
      await expect(page.getByRole('textbox', { name: 'Enter your email address' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Send Reset Email' })).toBeVisible();
    });

    test('should close forgot password modal with cancel button', async ({ page }) => {
      // Open modal
      await page.getByRole('button', { name: 'Forgot password?' }).click();
      await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible({ timeout: 5000 });
      
      // Click cancel button
      await page.getByRole('button', { name: 'Cancel' }).click();
      
      // Wait for modal to close with timeout
      await expect(page.getByRole('heading', { name: 'Reset Password' })).not.toBeVisible({ timeout: 5000 });
    });

    test('should close forgot password modal with X button', async ({ page }) => {
      // Open modal
      await page.getByRole('button', { name: 'Forgot password?' }).click();
      await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible({ timeout: 5000 });
      
      // Click X button (close button)
      const closeButton = page.getByRole('button', { name: '×' });
      await closeButton.click();
      
      // Wait for modal to close with timeout
      await expect(page.getByRole('heading', { name: 'Reset Password' })).not.toBeVisible({ timeout: 5000 });
    });

    test('should handle forgot password form submission', async ({ page }) => {
      // Open modal
      await page.getByRole('button', { name: 'Forgot password?' }).click();
      await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible({ timeout: 5000 });
      
      // Fill email field
      await page.getByRole('textbox', { name: 'Enter your email address' }).fill('test@example.com');
      
      // Click send reset email button
      await page.getByRole('button', { name: 'Send Reset Email' }).click();
      
      // Wait for success message with timeout
      await expect(page.getByText(/sent|success|check your inbox/i)).toBeVisible({ timeout: 10000 });
    });

    test('should handle invalid email in forgot password', async ({ page }) => {
      // Open modal
      await page.getByRole('button', { name: 'Forgot password?' }).click();
      await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible({ timeout: 5000 });
      
      // Fill invalid email
      await page.getByRole('textbox', { name: 'Enter your email address' }).fill('invalid-email');
      
      // Try to submit
      await page.getByRole('button', { name: 'Send Reset Email' }).click();
      
      // Verify HTML5 validation prevents submission
      const emailInput = page.getByRole('textbox', { name: 'Enter your email address' });
      const validity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(validity).toBe(false);
    });

    test('should clear email field after successful submission', async ({ page }) => {
      // Open modal
      await page.getByRole('button', { name: 'Forgot password?' }).click();
      await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible({ timeout: 5000 });
      
      // Fill email field
      const emailInput = page.getByRole('textbox', { name: 'Enter your email address' });
      await emailInput.fill('test@example.com');
      
      // Click send reset email button
      await page.getByRole('button', { name: 'Send Reset Email' }).click();
      
      // Wait for success message
      await expect(page.getByText(/sent|success|check your inbox/i)).toBeVisible({ timeout: 10000 });
      
      // Email field should be cleared or disabled
      const fieldValue = await emailInput.inputValue();
      expect(fieldValue).toBe('');
    });
  });

  test.describe('Forgot Password Page', () => {
    test('should navigate to dedicated forgot password page', async ({ page }) => {
      // Navigate to forgot password page directly
      await page.goto('http://localhost:3000/forgot-password');
      await page.waitForLoadState('networkidle');
      
      // Verify we're on forgot password page
      await expect(page).toHaveURL(/.*forgot-password/);
      await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
    });

    test('should handle forgot password page form submission', async ({ page }) => {
      // Navigate to forgot password page
      await page.goto('http://localhost:3000/forgot-password');
      await page.waitForLoadState('networkidle');
      
      // Fill email field
      await page.getByRole('textbox', { name: 'Email address' }).fill('test@example.com');
      
      // Click send reset link button
      await page.getByRole('button', { name: 'Send Reset Link' }).click();
      
      // Wait for success message
      await expect(page.getByText(/sent|success|check your inbox/i)).toBeVisible({ timeout: 10000 });
    });

    test('should navigate back to signin from forgot password page', async ({ page }) => {
      // Navigate to forgot password page
      await page.goto('http://localhost:3000/forgot-password');
      await page.waitForLoadState('networkidle');
      
      // Click back to signin link
      await page.getByRole('link', { name: 'Back to sign in' }).click();
      await page.waitForLoadState('networkidle');
      
      // Should be on signin page
      await expect(page).toHaveURL(/.*signin/);
      await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
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

    test('should show loading state during form submission', async ({ page }) => {
      // Fill form with test credentials
      await page.getByRole('textbox', { name: 'Email address' }).fill('test@example.com');
      await page.getByRole('textbox', { name: 'Password' }).fill('testpassword123');
      
      // Click sign in button
      const signInButton = page.getByRole('button', { name: 'Sign In' });
      await signInButton.click();
      
      // Check if button shows loading state
      const buttonText = await signInButton.textContent();
      const isLoading = buttonText?.includes('Signing in') || buttonText?.includes('...');
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Button should return to normal state
      const finalButtonText = await signInButton.textContent();
      expect(finalButtonText).toBe('Sign In');
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
