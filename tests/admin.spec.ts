import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000';

// Test credentials
const ADMIN_EMAIL = 'admin@agrimart.com';
const ADMIN_PASSWORD = 'Admin@123';

test.describe('Admin Panel E2E Tests', () => {
  
  test.describe('Authentication', () => {
    
    test('should show login page', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await expect(page.getByText('AgriMart Admin')).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.getByRole('textbox', { name: 'Email' }).fill('wrong@email.com');
      await page.getByRole('textbox', { name: 'Password' }).fill('wrongpassword');
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Wait for error toast or message
      await expect(page.getByText(/invalid|error|failed/i)).toBeVisible({ timeout: 5000 });
    });

    test('should login successfully with valid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.getByRole('textbox', { name: 'Email' }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: 'Password' }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(BASE_URL + '/', { timeout: 10000 });
      await expect(page.getByText('Total Revenue')).toBeVisible();
    });

    test('should logout successfully', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.getByRole('textbox', { name: 'Email' }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: 'Password' }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page).toHaveURL(BASE_URL + '/', { timeout: 10000 });
      
      // Click logout
      await page.getByRole('button', { name: 'LOGOUT' }).click();
      
      // Should redirect to login
      await expect(page).toHaveURL(`${BASE_URL}/login`);
    });
  });

  test.describe('Dashboard', () => {
    
    test.beforeEach(async ({ page }) => {
      // Login before each dashboard test
      await page.goto(`${BASE_URL}/login`);
      await page.getByRole('textbox', { name: 'Email' }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: 'Password' }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page).toHaveURL(BASE_URL + '/', { timeout: 10000 });
    });

    test('should display dashboard metrics', async ({ page }) => {
      await expect(page.getByText('Total Revenue')).toBeVisible();
      await expect(page.getByText('Total Orders')).toBeVisible();
      await expect(page.getByText('Active Users')).toBeVisible();
      await expect(page.getByText('Negotiations')).toBeVisible();
    });

    test('should display sales chart', async ({ page }) => {
      await expect(page.getByText('Sales Overview')).toBeVisible();
    });

    test('should display recent orders table', async ({ page }) => {
      await expect(page.getByText('Recent Orders')).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Order ID' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Customer' })).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.getByRole('textbox', { name: 'Email' }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: 'Password' }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page).toHaveURL(BASE_URL + '/', { timeout: 10000 });
    });

    test('should navigate to Products page', async ({ page }) => {
      await page.getByRole('link', { name: 'PRODUCTS' }).click();
      await expect(page).toHaveURL(`${BASE_URL}/products`);
      await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    });

    test('should navigate to Orders page', async ({ page }) => {
      await page.getByRole('link', { name: 'ORDERS' }).click();
      await expect(page).toHaveURL(`${BASE_URL}/orders`);
      await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();
    });

    test('should navigate to Negotiations page', async ({ page }) => {
      await page.getByRole('link', { name: 'NEGOTIATIONS' }).click();
      await expect(page).toHaveURL(`${BASE_URL}/negotiations`);
      await expect(page.getByRole('heading', { name: 'Negotiations' })).toBeVisible();
    });

    test('should navigate to Customers page', async ({ page }) => {
      await page.getByRole('link', { name: 'CUSTOMERS' }).click();
      await expect(page).toHaveURL(`${BASE_URL}/customers`);
      await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();
    });

    test('should navigate to Analytics page', async ({ page }) => {
      await page.getByRole('link', { name: 'ANALYTICS' }).click();
      await expect(page).toHaveURL(`${BASE_URL}/analytics`);
      await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
    });

    test('should navigate to Settings page', async ({ page }) => {
      await page.getByRole('link', { name: 'SETTINGS' }).click();
      await expect(page).toHaveURL(`${BASE_URL}/settings`);
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    });
  });

  test.describe('Products Management', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.getByRole('textbox', { name: 'Email' }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: 'Password' }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page).toHaveURL(BASE_URL + '/', { timeout: 10000 });
      await page.getByRole('link', { name: 'PRODUCTS' }).click();
    });

    test('should display products table', async ({ page }) => {
      await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'SKU' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Price' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Stock' })).toBeVisible();
    });

    test('should navigate to Add Product page', async ({ page }) => {
      await page.getByRole('link', { name: 'Add Product' }).click();
      await expect(page).toHaveURL(`${BASE_URL}/products/add`);
      await expect(page.getByRole('heading', { name: 'Add New Product' })).toBeVisible();
    });

    test('should display add product form fields', async ({ page }) => {
      await page.getByRole('link', { name: 'Add Product' }).click();
      await expect(page.getByRole('textbox', { name: 'Product Name' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Description' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'SKU' })).toBeVisible();
      await expect(page.getByRole('spinbutton', { name: 'MRP (₹)' })).toBeVisible();
    });
  });

  test.describe('Orders Management', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.getByRole('textbox', { name: 'Email' }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: 'Password' }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page).toHaveURL(BASE_URL + '/', { timeout: 10000 });
      await page.getByRole('link', { name: 'ORDERS' }).click();
    });

    test('should display orders table', async ({ page }) => {
      await page.waitForTimeout(2000); // Wait for data to load
      await expect(page.getByRole('columnheader', { name: 'Order #' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Customer' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Total' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    });

    test('should open order details dialog', async ({ page }) => {
      await page.waitForTimeout(2000);
      // Click on first order's action button
      const firstOrderRow = page.getByRole('row').nth(1);
      const actionButton = firstOrderRow.getByRole('button');
      
      if (await actionButton.isVisible()) {
        await actionButton.click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText('Order Details')).toBeVisible();
      }
    });
  });

  test.describe('Negotiations Management', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.getByRole('textbox', { name: 'Email' }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: 'Password' }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page).toHaveURL(BASE_URL + '/', { timeout: 10000 });
      await page.getByRole('link', { name: 'NEGOTIATIONS' }).click();
    });

    test('should display negotiations table', async ({ page }) => {
      await expect(page.getByRole('columnheader', { name: 'ID' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Wholesaler' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Product' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    });

    test('should open negotiation details dialog', async ({ page }) => {
      await page.waitForTimeout(2000);
      const firstRow = page.getByRole('row').nth(1);
      const actionButton = firstRow.getByRole('button');
      
      if (await actionButton.isVisible()) {
        await actionButton.click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText('Negotiation Details')).toBeVisible();
      }
    });
  });

  test.describe('Settings Page', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.getByRole('textbox', { name: 'Email' }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: 'Password' }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page).toHaveURL(BASE_URL + '/', { timeout: 10000 });
      await page.getByRole('link', { name: 'SETTINGS' }).click();
    });

    test('should display settings form', async ({ page }) => {
      await expect(page.getByText('General Information')).toBeVisible();
      await expect(page.getByText('Payment Settings')).toBeVisible();
      await expect(page.getByText('Operational Settings')).toBeVisible();
    });

    test('should have save button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
    });
  });
});
