import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  document.cookie.split(';').forEach((cookie) => {
    const [name] = cookie.split('=');
    if (name?.trim()) {
      document.cookie = `${name.trim()}=; Max-Age=0; Path=/`;
    }
  });
});
