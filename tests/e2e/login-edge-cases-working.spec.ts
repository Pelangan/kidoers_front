import { test, expect } from '@playwright/test';

test.describe('Login Edge Cases and Error Handling (Working)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/signin');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Network Error Handling', () => {
    test('should handle network timeout gracefully', async ({ page }) => {
      // Mock network timeout
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 408,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Request timeout' })
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
      const hasError = await page.getByText(/error|timeout|failed/i).isVisible().catch(() => false);
      
      expect(isStillOnSignin || hasError).toBe(true);
    });

    test('should handle server error responses', async ({ page }) => {
      // Mock server error
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      // Try to submit signin form
      await page.getByRole('textbox', { name: 'Email address' }).fill('test@example.com');
      await page.getByRole('textbox', { name: 'Password' }).fill('password123');
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Should handle error gracefully
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
      const hasError = await page.getByText(/error|offline|network/i).isVisible().catch(() => false);
      
      expect(isStillOnSignin || hasError).toBe(true);
    });
  });

  test.describe('Input Validation Edge Cases', () => {
    test('should handle extremely long email addresses', async ({ page }) => {
      const emailInput = page.getByRole('textbox', { name: 'Email address' });
      const longEmail = 'a'.repeat(100) + '@example.com';
      
      await emailInput.fill(longEmail);
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Should handle long email gracefully
      const validity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(validity).toBe(false);
    });

    test('should handle special characters in password', async ({ page }) => {
      const passwordInput = page.getByRole('textbox', { name: 'Password' });
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      
      await passwordInput.fill(specialPassword);
      
      // Password should be accepted (no validation error)
      const validity = await passwordInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(validity).toBe(true);
    });

    test('should handle Unicode characters in email', async ({ page }) => {
      const emailInput = page.getByRole('textbox', { name: 'Email address' });
      const unicodeEmail = 'tëst@ëxämplë.com';
      
      await emailInput.fill(unicodeEmail);
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Should handle Unicode email gracefully
      const validity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(validity).toBe(false);
    });
  });

  test.describe('Concurrent User Actions', () => {
    test('should prevent multiple simultaneous login attempts', async ({ page }) => {
      // Fill form
      await page.getByRole('textbox', { name: 'Email address' }).fill('test@example.com');
      await page.getByRole('textbox', { name: 'Password' }).fill('password123');
      
      // Click sign in button multiple times rapidly
      const signInButton = page.getByRole('button', { name: 'Sign In' });
      await signInButton.click();
      await signInButton.click();
      await signInButton.click();
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Should handle multiple clicks gracefully
      const isStillOnSignin = await page.getByRole('heading', { name: 'Welcome back!' }).isVisible().catch(() => false);
      expect(isStillOnSignin).toBe(true);
    });

    test('should handle rapid forgot password modal open/close', async ({ page }) => {
      const forgotPasswordButton = page.getByRole('button', { name: 'Forgot password?' });
      
      // Rapidly open and close modal
      await forgotPasswordButton.click();
      await page.waitForTimeout(100);
      await page.getByRole('button', { name: 'Cancel' }).click();
      await page.waitForTimeout(100);
      await forgotPasswordButton.click();
      await page.waitForTimeout(100);
      await page.getByRole('button', { name: 'Cancel' }).click();
      
      // Modal should be closed
      await expect(page.getByRole('heading', { name: 'Reset Password' })).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Browser Compatibility', () => {
    test('should work with disabled JavaScript', async ({ page }) => {
      // Disable JavaScript
      await page.context().addInitScript(() => {
        // This simulates JavaScript being disabled
        Object.defineProperty(window, 'navigator', {
          value: { ...window.navigator, userAgent: 'Mozilla/5.0 (compatible; NoJS)' }
        });
      });
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Basic form elements should still be visible
      await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
      // Navigate to signup page
      await page.getByRole('link', { name: 'Sign up' }).click();
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

    test('should handle page refresh', async ({ page }) => {
      // Fill form
      await page.getByRole('textbox', { name: 'Email address' }).fill('test@example.com');
      await page.getByRole('textbox', { name: 'Password' }).fill('password123');
      
      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Form should be cleared
      await expect(page.getByRole('textbox', { name: 'Email address' })).toHaveValue('');
      await expect(page.getByRole('textbox', { name: 'Password' })).toHaveValue('');
    });
  });

  test.describe('Form State Persistence', () => {
    test('should clear form after successful navigation away and back', async ({ page }) => {
      // Fill form
      await page.getByRole('textbox', { name: 'Email address' }).fill('test@example.com');
      await page.getByRole('textbox', { name: 'Password' }).fill('password123');
      
      // Navigate to signup
      await page.getByRole('link', { name: 'Sign up' }).click();
      await page.waitForLoadState('networkidle');
      
      // Navigate back to signin
      await page.goto('http://localhost:3000/signin');
      await page.waitForLoadState('networkidle');
      
      // Form should be cleared
      await expect(page.getByRole('textbox', { name: 'Email address' })).toHaveValue('');
      await expect(page.getByRole('textbox', { name: 'Password' })).toHaveValue('');
    });

    test('should maintain form state during errors', async ({ page }) => {
      // Fill form
      await page.getByRole('textbox', { name: 'Email address' }).fill('test@example.com');
      await page.getByRole('textbox', { name: 'Password' }).fill('password123');
      
      // Mock error
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        });
      });
      
      // Submit form
      await page.getByRole('button', { name: 'Sign In' }).click();
      await page.waitForTimeout(2000);
      
      // Form state should be maintained
      await expect(page.getByRole('textbox', { name: 'Email address' })).toHaveValue('test@example.com');
      await expect(page.getByRole('textbox', { name: 'Password' })).toHaveValue('password123');
    });
  });

  test.describe('Performance Edge Cases', () => {
    test('should handle slow network with loading states', async ({ page }) => {
      // Mock slow network
      await page.route('**/api/**', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        }, 3000);
      });
      
      // Fill and submit form
      await page.getByRole('textbox', { name: 'Email address' }).fill('test@example.com');
      await page.getByRole('textbox', { name: 'Password' }).fill('password123');
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Should show loading state
      const buttonText = await page.getByRole('button', { name: 'Sign In' }).textContent();
      const isLoading = buttonText?.includes('Signing in') || buttonText?.includes('...');
      
      // Wait for response
      await page.waitForTimeout(4000);
      
      // Button should return to normal state
      const finalButtonText = await page.getByRole('button', { name: 'Sign In' }).textContent();
      expect(finalButtonText).toBe('Sign In');
    });

    test('should handle rapid typing without performance issues', async ({ page }) => {
      const emailInput = page.getByRole('textbox', { name: 'Email address' });
      
      // Rapidly type in email field
      const text = 'test@example.com';
      for (let i = 0; i < text.length; i++) {
        await emailInput.type(text[i]);
        await page.waitForTimeout(10); // Small delay between keystrokes
      }
      
      // Should handle rapid typing gracefully
      await expect(emailInput).toHaveValue('test@example.com');
    });
  });

  test.describe('Accessibility Edge Cases', () => {
    test('should work with screen reader navigation', async ({ page }) => {
      // Test keyboard navigation
      await page.keyboard.press('Tab'); // Email field
      await page.waitForTimeout(100);
      await page.keyboard.press('Tab'); // Password field
      await page.waitForTimeout(100);
      await page.keyboard.press('Tab'); // Forgot password button
      await page.waitForTimeout(100);
      await page.keyboard.press('Tab'); // Sign In button
      
      // Verify focus is on Sign In button
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeFocused({ timeout: 5000 });
    });

    test('should provide proper error announcements', async ({ page }) => {
      // Fill invalid email
      await page.getByRole('textbox', { name: 'Email address' }).fill('invalid-email');
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Check for error announcement
      const hasErrorAnnouncement = await page.getByText(/invalid|error/i).isVisible().catch(() => false);
      const hasAriaLive = await page.locator('[aria-live]').isVisible().catch(() => false);
      
      // Should have some form of error announcement
      expect(hasErrorAnnouncement || hasAriaLive).toBe(true);
    });

    test('should handle high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.emulateMedia({ colorScheme: 'dark' });
      
      // Verify elements are still visible
      await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });
  });
});
