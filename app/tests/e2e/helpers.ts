import { expect, type Page } from '@playwright/test';

type UserCredentials = {
  username: string;
  password: string;
  role: string;
};

export async function gotoApp(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'WeatherScope' })).toBeVisible();
}

export async function login(page: Page, user: UserCredentials) {
  await gotoApp(page);
  await page.getByTestId('login-link').click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Log in to the weather console.' })).toBeVisible();

  await page.getByLabel('Username').fill(user.username);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('user-pill')).toContainText(`${user.username} (${user.role})`);
}

export async function logout(page: Page) {
  await page.getByTestId('logout-button').click();
  await expect(page.getByTestId('login-link')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign in to view the live weather board.' })).toBeVisible();
}
