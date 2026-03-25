import { expect, test } from '@playwright/test';
import { gotoApp } from './helpers';

const apiBaseURL = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:8080/api/v1';

test.describe('Smoke @smoke', () => {
  test('app shell loads successfully', async ({ page }) => {
    await gotoApp(page);

    await expect(page.getByRole('link', { name: 'Current Weather' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Premium Forecast' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign in to view the live weather board.' })).toBeVisible();
  });

  test('health endpoint is reachable', async ({ request }) => {
    const response = await request.get(`${apiBaseURL}/system/health`);

    expect(response.ok()).toBeTruthy();
    await expect(response).toBeOK();
    await expect(response.json()).resolves.toEqual({ status: 'healthy' });
  });
});
