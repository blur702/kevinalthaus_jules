import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { RegisterPage } from '../../pages/auth/register-page';
import { DashboardPage } from '../../pages/core/dashboard-page';
import { TestData } from '../../fixtures/test-data';

test.describe('Visual Regression Testing', () => {
  test.describe('Authentication Pages @visual @critical', () => {
    test('login page visual consistency', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Wait for page to be fully loaded
      await loginPage.waitForPageReady();
      await loginPage.waitForAnimations();
      
      // Take full page screenshot
      await expect(page).toHaveScreenshot('login-page.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('login page with validation errors', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Submit empty form to show validation errors
      await loginPage.submitLogin();
      await page.waitForTimeout(1000); // Wait for errors to appear
      
      await expect(page).toHaveScreenshot('login-page-errors.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('registration page visual consistency', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      
      await registerPage.waitForPageReady();
      await registerPage.waitForAnimations();
      
      await expect(page).toHaveScreenshot('register-page.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('registration page with validation errors', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      
      // Submit form with invalid data
      await registerPage.fillRegistrationForm({
        firstName: '',
        lastName: '',
        email: 'invalid-email',
        password: 'weak',
        confirmPassword: 'different',
        agreeToTerms: false
      });
      
      await registerPage.submitRegistration();
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('register-page-errors.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('password strength indicator', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      
      // Fill password to show strength indicator
      await page.locator('[data-testid="password"]').fill('StrongPassword123!');
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('password-strength.png', {
        clip: { x: 0, y: 300, width: 800, height: 400 }
      });
    });
  });

  test.describe('Theme Variations @visual @regression', () => {
    test('login page in light theme', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      await loginPage.switchTheme('light');
      await loginPage.waitForPageReady();
      
      await expect(page).toHaveScreenshot('login-light-theme.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('login page in dark theme', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      await loginPage.switchTheme('dark');
      await loginPage.waitForPageReady();
      
      await expect(page).toHaveScreenshot('login-dark-theme.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('dashboard in light theme', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      await dashboardPage.switchTheme('light');
      await dashboardPage.waitForDashboardLoad();
      
      await expect(page).toHaveScreenshot('dashboard-light-theme.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('dashboard in dark theme', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      await dashboardPage.switchTheme('dark');
      await dashboardPage.waitForDashboardLoad();
      
      await expect(page).toHaveScreenshot('dashboard-dark-theme.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Responsive Design Visual Tests @visual @responsive', () => {
    test('login page on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.waitForPageReady();
      
      await expect(page).toHaveScreenshot('login-mobile.png', {
        fullPage: true
      });
    });

    test('login page on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.waitForPageReady();
      
      await expect(page).toHaveScreenshot('login-tablet.png', {
        fullPage: true
      });
    });

    test('dashboard on mobile with sidebar collapsed', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      // Ensure sidebar is collapsed on mobile
      await dashboardPage.toggleSidebar();
      
      await expect(page).toHaveScreenshot('dashboard-mobile.png', {
        fullPage: true
      });
    });

    test('dashboard on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      await expect(page).toHaveScreenshot('dashboard-tablet.png', {
        fullPage: true
      });
    });

    test('dashboard on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      await expect(page).toHaveScreenshot('dashboard-desktop.png', {
        fullPage: true
      });
    });
  });

  test.describe('Component States @visual', () => {
    test('form elements in different states', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Show different input states
      const emailInput = page.locator('[data-testid="email"]');
      const passwordInput = page.locator('[data-testid="password"]');
      
      // Focused state
      await emailInput.focus();
      await expect(page).toHaveScreenshot('form-focused-state.png', {
        clip: { x: 0, y: 200, width: 800, height: 300 }
      });
      
      // Filled state
      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');
      await expect(page).toHaveScreenshot('form-filled-state.png', {
        clip: { x: 0, y: 200, width: 800, height: 300 }
      });
      
      // Error state
      await loginPage.submitLogin();
      await page.waitForTimeout(1000);
      await expect(page).toHaveScreenshot('form-error-state.png', {
        clip: { x: 0, y: 200, width: 800, height: 400 }
      });
    });

    test('button states', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      const loginButton = page.locator('[data-testid="login-button"]');
      
      // Default state
      await expect(page).toHaveScreenshot('button-default.png', {
        clip: { x: 0, y: 400, width: 400, height: 100 }
      });
      
      // Hover state
      await loginButton.hover();
      await expect(page).toHaveScreenshot('button-hover.png', {
        clip: { x: 0, y: 400, width: 400, height: 100 }
      });
      
      // Disabled state (by removing required fields)
      await page.evaluate(() => {
        const button = document.querySelector('[data-testid="login-button"]') as HTMLButtonElement;
        if (button) button.disabled = true;
      });
      await expect(page).toHaveScreenshot('button-disabled.png', {
        clip: { x: 0, y: 400, width: 400, height: 100 }
      });
    });

    test('loading states', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Mock slow response to show loading state
      await page.route('**/api/auth/login', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.fulfill({
          status: 200,
          body: JSON.stringify({ token: 'test' })
        });
      });
      
      await loginPage.fillCredentials('test@example.com', 'password');
      
      const submitPromise = loginPage.submitLogin();
      
      // Capture loading state
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('loading-state.png', {
        clip: { x: 0, y: 300, width: 800, height: 200 }
      });
      
      await submitPromise;
    });
  });

  test.describe('Layout and Positioning @visual', () => {
    test('dashboard widget layout', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      // Capture individual widgets
      const welcomeCard = page.locator('[data-testid="welcome-card"]');
      if (await welcomeCard.isVisible()) {
        await expect(welcomeCard).toHaveScreenshot('welcome-widget.png');
      }
      
      const statsCards = page.locator('[data-testid="stats-card"]').first();
      if (await statsCards.isVisible()) {
        await expect(statsCards).toHaveScreenshot('stats-widget.png');
      }
    });

    test('sidebar navigation', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      const sidebar = page.locator('[data-testid="sidebar"]');
      await expect(sidebar).toHaveScreenshot('sidebar-navigation.png');
    });

    test('header and top bar', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      const topBar = page.locator('[data-testid="top-bar"]');
      await expect(topBar).toHaveScreenshot('top-bar.png');
    });
  });

  test.describe('Accessibility Visual Features @visual @accessibility', () => {
    test('high contrast mode', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Enable high contrast
      await page.emulateMedia({ forcedColors: 'active' });
      await loginPage.waitForPageReady();
      
      await expect(page).toHaveScreenshot('login-high-contrast.png', {
        fullPage: true
      });
    });

    test('focus indicators', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Focus on different elements to show focus indicators
      const elements = [
        '[data-testid="email"]',
        '[data-testid="password"]',
        '[data-testid="login-button"]'
      ];
      
      for (const selector of elements) {
        await page.locator(selector).focus();
        await expect(page).toHaveScreenshot(`focus-${selector.replace(/[\[\]"=]/g, '')}.png`, {
          clip: { x: 0, y: 150, width: 800, height: 400 }
        });
      }
    });

    test('reduced motion preferences', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      // Enable reduced motion
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      await expect(page).toHaveScreenshot('dashboard-reduced-motion.png', {
        fullPage: true
      });
    });
  });

  test.describe('Error States @visual', () => {
    test('network error page', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      // Simulate network failure
      await page.route('**/*', route => route.abort());
      
      await page.goto('/dashboard').catch(() => {});
      await page.waitForTimeout(2000);
      
      await expect(page).toHaveScreenshot('network-error.png', {
        fullPage: true
      });
    });

    test('404 error page', async ({ page }) => {
      await page.goto('/non-existent-page').catch(() => {});
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('404-error.png', {
        fullPage: true
      });
    });

    test('form validation errors comprehensive', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      
      // Fill all fields with invalid data
      await registerPage.fillRegistrationForm({
        firstName: '  ', // Only spaces
        lastName: '  ',
        email: 'not-an-email',
        password: '123', // Too weak
        confirmPassword: '456', // Doesn't match
        agreeToTerms: false // Not accepted
      });
      
      await registerPage.submitRegistration();
      await page.waitForTimeout(1500);
      
      await expect(page).toHaveScreenshot('comprehensive-validation-errors.png', {
        fullPage: true
      });
    });
  });

  test.describe('Animation and Transitions @visual', () => {
    test('theme transition animation', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Start with light theme
      await loginPage.switchTheme('light');
      await page.waitForTimeout(300);
      
      // Capture before transition
      await expect(page).toHaveScreenshot('theme-before-transition.png');
      
      // Switch to dark theme and capture mid-transition
      await loginPage.switchTheme('dark');
      await page.waitForTimeout(150); // Capture mid-transition
      
      await expect(page).toHaveScreenshot('theme-mid-transition.png');
      
      // Capture after transition
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot('theme-after-transition.png');
    });

    test('modal animations', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      // Open user profile dropdown/modal
      const profileButton = page.locator('[data-testid="profile-dropdown"]');
      if (await profileButton.isVisible()) {
        await profileButton.click();
        await page.waitForTimeout(200);
        
        await expect(page).toHaveScreenshot('modal-animation.png', {
          clip: { x: 0, y: 0, width: 1200, height: 600 }
        });
      }
    });

    test('sidebar slide animation', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      // Capture sidebar open
      await expect(page).toHaveScreenshot('sidebar-open.png');
      
      // Toggle sidebar and capture animation
      await dashboardPage.toggleSidebar();
      await page.waitForTimeout(150); // Mid-animation
      
      await expect(page).toHaveScreenshot('sidebar-closing.png');
      
      await page.waitForTimeout(300); // After animation
      await expect(page).toHaveScreenshot('sidebar-closed.png');
    });
  });

  test.describe('Cross-browser Visual Consistency @visual @cross-browser', () => {
    test('login page cross-browser', async ({ page, browserName }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.waitForPageReady();
      
      await expect(page).toHaveScreenshot(`login-${browserName}.png`, {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('dashboard cross-browser', async ({ page, browserName }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      await expect(page).toHaveScreenshot(`dashboard-${browserName}.png`, {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Print Styles @visual', () => {
    test('login page print view', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Emulate print media
      await page.emulateMedia({ media: 'print' });
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('login-print-view.png', {
        fullPage: true
      });
    });

    test('dashboard print view', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      await page.emulateMedia({ media: 'print' });
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('dashboard-print-view.png', {
        fullPage: true
      });
    });
  });
});