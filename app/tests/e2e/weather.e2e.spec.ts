import { expect, test } from '@playwright/test';
import { gotoApp, login, logout } from './helpers';
import { locations, users } from './test-data';

const apiBaseURL = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:8080/api/v1';

test.describe('Weather E2E', () => {
  test('seeded user can log in, fetch current weather, and log out', async ({ page }) => {
    await gotoApp(page);
    await login(page, users.basic);

    await expect(page.getByTestId('current-weather-location')).toHaveText('Seattle');
    await expect(page.getByText('Current Snapshot')).toBeVisible();

    await page.getByTestId('current-weather-search').fill(locations.current);
    await page.getByTestId('current-weather-submit').click();

    await expect(page.getByTestId('current-weather-location')).toHaveText(locations.current);
    await expect(page.getByText('LOCATION')).toBeVisible();

    await logout(page);
  });

  test('premium user can view the premium forecast journey', async ({ page }) => {
    await login(page, users.premium);

    await page.getByRole('link', { name: 'Premium Forecast' }).click();
    await expect(page).toHaveURL(/\/forecast$/);
    await expect(page.getByTestId('premium-forecast-location')).toHaveText('Seattle');
    await expect(page.getByText('7-Day Forecast', { exact: true })).toBeVisible();
    await expect(page.getByTestId('premium-forecast-card')).toHaveCount(7);

    await page.getByTestId('premium-forecast-search').fill(locations.premium);
    await page.getByTestId('premium-forecast-submit').click();

    await expect(page.getByTestId('premium-forecast-location')).toHaveText(locations.premium);
    await expect(page.getByTestId('premium-forecast-card')).toHaveCount(7);
  });

  test('basic user is blocked from premium forecast UI and API access', async ({ page, request }) => {
    await login(page, users.basic);

    await page.getByRole('link', { name: 'Premium Forecast' }).click();
    await expect(page).toHaveURL(/\/forecast$/);
    await expect(page.getByRole('heading', { name: 'Premium access required.' })).toBeVisible();
    await expect(page.getByText('Your current role is')).toContainText(users.basic.role);

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((cookie) => cookie.name.startsWith('connect.sid'));

    expect(sessionCookie, 'expected an authenticated session cookie after UI login').toBeDefined();

    const response = await request.get(`${apiBaseURL}/weather/premium-forecast?location=${locations.premium}`, {
      headers: {
        Cookie: `${sessionCookie!.name}=${sessionCookie!.value}`
      }
    });

    expect(response.status()).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
  });
});
