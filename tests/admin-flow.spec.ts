import { test, expect } from '@playwright/test';

test.describe('Admin Panel Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Go to login page
        await page.goto('http://localhost:3000/login');
    });

    test('should login with admin credentials', async ({ page }) => {
        // Fill login form
        await page.fill('input[name="email"]', 'admin@agrimart.com');
        await page.fill('input[name="password"]', 'admin123');
        
        // Click sign in
        await page.click('button[type="submit"]');
        
        // Wait for navigation to dashboard
        await page.waitForURL('http://localhost:3000/', { timeout: 10000 });
        
        // Verify we're on dashboard
        await expect(page).toHaveURL('http://localhost:3000/');
    });

    test('should navigate to products page', async ({ page }) => {
        // Login first
        await page.fill('input[name="email"]', 'admin@agrimart.com');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:3000/', { timeout: 10000 });
        
        // Navigate to products
        await page.click('text=Products');
        await page.waitForURL('**/products', { timeout: 5000 });
        
        // Verify products page
        await expect(page.locator('h1')).toContainText('Products');
    });

    test('should open add product page', async ({ page }) => {
        // Login first
        await page.fill('input[name="email"]', 'admin@agrimart.com');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:3000/', { timeout: 10000 });
        
        // Navigate to products
        await page.click('text=Products');
        await page.waitForURL('**/products', { timeout: 5000 });
        
        // Click Add Product
        await page.click('text=Add Product');
        await page.waitForURL('**/products/add', { timeout: 5000 });
        
        // Verify add product page
        await expect(page.locator('h1')).toContainText('Add New Product');
    });

    test('should create a new product', async ({ page }) => {
        // Login first
        await page.fill('input[name="email"]', 'admin@agrimart.com');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:3000/', { timeout: 10000 });
        
        // Navigate to add product
        await page.goto('http://localhost:3000/products/add');
        await page.waitForLoadState('networkidle');
        
        // Fill product form
        await page.fill('input[name="name"]', 'Test Product ' + Date.now());
        await page.fill('textarea[name="description"]', 'This is a test product description for Playwright testing.');
        
        // Select category
        await page.click('[data-slot="select-trigger"]:has-text("Select category")');
        await page.click('text=Machinery');
        
        // Fill SKU
        await page.fill('input[name="sku"]', 'TEST-' + Date.now());
        
        // Fill pricing
        await page.fill('input[name="mrp"]', '10000');
        await page.fill('input[name="retailPrice"]', '9000');
        await page.fill('input[name="wholesalePrice"]', '8000');
        await page.fill('input[name="stock"]', '100');
        await page.fill('input[name="minWholesaleQuantity"]', '10');
        
        // Fill image URL
        await page.fill('input[name="imageUrl"]', 'https://example.com/image.jpg');
        
        // Select status
        await page.click('[data-slot="select-trigger"]:has-text("draft")');
        await page.click('text=Active');
        
        // Submit form
        await page.click('button:has-text("Create Product")');
        
        // Wait for success toast or redirect
        await page.waitForURL('**/products', { timeout: 10000 });
        
        // Verify redirect to products page
        await expect(page).toHaveURL(/\/products$/);
    });

    test('should logout when token expires', async ({ page }) => {
        // Login first
        await page.fill('input[name="email"]', 'admin@agrimart.com');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:3000/', { timeout: 10000 });
        
        // Clear access token to simulate expiry
        await page.evaluate(() => {
            localStorage.removeItem('accessToken');
        });
        
        // Refresh page
        await page.reload();
        
        // Should redirect to login
        await page.waitForURL('**/login', { timeout: 10000 });
        await expect(page).toHaveURL(/\/login$/);
    });
});
