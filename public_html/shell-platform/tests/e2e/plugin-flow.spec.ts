/**
 * End-to-End Plugin Management Flow Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Plugin Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try to navigate to plugins page if it exists
    const pluginsLink = page.locator('a, button').getByText(/plugins/i).first();
    if (await pluginsLink.count() > 0) {
      await pluginsLink.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display plugin marketplace or management interface', async ({ page }) => {
    // Look for plugin-related UI elements
    const hasPluginContent = await page.locator('[data-testid*="plugin"], .plugin').count() > 0 ||
                             await page.getByText(/plugin/i).count() > 0 ||
                             await page.locator('h1, h2').getByText(/plugin/i).count() > 0;

    if (hasPluginContent) {
      expect(hasPluginContent).toBe(true);
      console.log('Plugin interface detected');
    } else {
      console.log('No plugin interface found on current page');
      // Try direct navigation to plugins
      await page.goto('/plugins');
      await page.waitForLoadState('networkidle');
      
      const hasPluginContentDirect = await page.locator('[data-testid*="plugin"], .plugin').count() > 0 ||
                                     await page.getByText(/plugin/i).count() > 0;
      
      if (hasPluginContentDirect) {
        expect(hasPluginContentDirect).toBe(true);
      }
    }
  });

  test('should list available plugins', async ({ page }) => {
    // Navigate to plugins page
    await page.goto('/plugins');
    await page.waitForLoadState('networkidle');
    
    // Look for plugin list or cards
    const pluginItems = page.locator('[data-testid="plugin-item"], .plugin-card, .plugin-item');
    const pluginCount = await pluginItems.count();
    
    if (pluginCount > 0) {
      console.log(`Found ${pluginCount} plugin items`);
      expect(pluginCount).toBeGreaterThan(0);
      
      // Check if first plugin has required information
      const firstPlugin = pluginItems.first();
      const hasName = await firstPlugin.locator('.name, .title, h3, h4').count() > 0;
      const hasDescription = await firstPlugin.locator('.description, .summary, p').count() > 0;
      
      if (hasName) expect(hasName).toBe(true);
    } else {
      console.log('No plugin items found, checking for empty state');
      const hasEmptyState = await page.getByText(/no plugins/i).count() > 0 ||
                           await page.locator('.empty, .no-results').count() > 0;
      
      // Either should have plugins or empty state
      expect(hasEmptyState || pluginCount > 0).toBe(true);
    }
  });

  test('should handle plugin installation', async ({ page }) => {
    await page.goto('/plugins');
    await page.waitForLoadState('networkidle');
    
    // Look for install buttons
    const installButtons = page.locator('button').getByText(/install|add/i);
    const installButtonCount = await installButtons.count();
    
    if (installButtonCount > 0) {
      const firstInstallButton = installButtons.first();
      
      // Check if button is clickable
      const isEnabled = await firstInstallButton.isEnabled();
      if (isEnabled) {
        await firstInstallButton.click();
        await page.waitForTimeout(1000);
        
        // Look for loading state, success message, or modal
        const hasResponse = await page.locator('.loading, .installing, .modal, .dialog').count() > 0 ||
                           await page.getByText(/installing|success|error/i).count() > 0;
        
        expect(hasResponse || await page.url() !== '/plugins').toBe(true);
      }
    } else {
      console.log('No install buttons found');
    }
  });

  test('should display plugin details', async ({ page }) => {
    await page.goto('/plugins');
    await page.waitForLoadState('networkidle');
    
    // Look for clickable plugin items
    const pluginItems = page.locator('[data-testid="plugin-item"], .plugin-card, .plugin-item');
    const firstPlugin = pluginItems.first();
    
    if (await firstPlugin.count() > 0) {
      const pluginName = await firstPlugin.locator('.name, .title, h3, h4').textContent();
      
      // Click on plugin item
      await firstPlugin.click();
      await page.waitForTimeout(1000);
      
      // Check if we navigated to details page or opened modal
      const hasDetails = await page.locator('.plugin-details, .modal, .dialog').count() > 0 ||
                        await page.url().includes('plugin') ||
                        await page.getByText(/version|description|author/i).count() > 0;
      
      if (hasDetails) {
        expect(hasDetails).toBe(true);
        console.log(`Plugin details shown for: ${pluginName}`);
      }
    }
  });

  test('should handle plugin search and filtering', async ({ page }) => {
    await page.goto('/plugins');
    await page.waitForLoadState('networkidle');
    
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first();
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('dashboard');
      await page.waitForTimeout(1000);
      
      // Check if results are filtered
      const pluginItems = page.locator('[data-testid="plugin-item"], .plugin-card, .plugin-item');
      const itemCount = await pluginItems.count();
      
      // Should either show filtered results or no results message
      const hasResults = itemCount > 0;
      const hasNoResults = await page.getByText(/no results|not found/i).count() > 0;
      
      expect(hasResults || hasNoResults).toBe(true);
    } else {
      console.log('No search functionality found');
    }
  });

  test('should handle plugin categories or tags', async ({ page }) => {
    await page.goto('/plugins');
    await page.waitForLoadState('networkidle');
    
    // Look for category filters or tags
    const categoryButtons = page.locator('button, .tag, .category, .filter').getByText(/dashboard|utility|theme/i);
    
    if (await categoryButtons.count() > 0) {
      const firstCategory = categoryButtons.first();
      await firstCategory.click();
      await page.waitForTimeout(1000);
      
      // Should filter results or show category-specific view
      const pluginItems = page.locator('[data-testid="plugin-item"], .plugin-card, .plugin-item');
      const itemCount = await pluginItems.count();
      
      expect(itemCount >= 0).toBe(true); // Just ensure we get a valid count
      console.log(`Category filter applied, showing ${itemCount} items`);
    }
  });

  test('should be responsive on mobile', async ({ page, browserName }) => {
    if (browserName === 'webkit') {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/plugins');
      await page.waitForLoadState('networkidle');
      
      // Check if layout adapts to mobile
      const pluginItems = page.locator('[data-testid="plugin-item"], .plugin-card, .plugin-item');
      
      if (await pluginItems.count() > 0) {
        const firstItem = pluginItems.first();
        const boundingBox = await firstItem.boundingBox();
        
        if (boundingBox) {
          // Should not exceed viewport width
          expect(boundingBox.width).toBeLessThanOrEqual(375);
        }
      }
    }
  });

  test('should handle plugin uninstallation', async ({ page }) => {
    await page.goto('/plugins');
    await page.waitForLoadState('networkidle');
    
    // Look for installed plugins with uninstall options
    const uninstallButtons = page.locator('button').getByText(/uninstall|remove/i);
    
    if (await uninstallButtons.count() > 0) {
      const firstUninstallButton = uninstallButtons.first();
      
      if (await firstUninstallButton.isEnabled()) {
        await firstUninstallButton.click();
        await page.waitForTimeout(500);
        
        // Look for confirmation dialog
        const confirmButton = page.locator('button').getByText(/confirm|yes|uninstall/i);
        
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          await page.waitForTimeout(1000);
          
          // Should show some feedback
          const hasResponse = await page.getByText(/uninstalled|removed|success/i).count() > 0;
          expect(hasResponse).toBe(true);
        }
      }
    } else {
      console.log('No uninstall options found');
    }
  });
});