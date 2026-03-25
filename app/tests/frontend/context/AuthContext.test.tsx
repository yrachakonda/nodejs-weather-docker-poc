import { ReactNode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../../frontend/src/context/AuthContext';
import { jsonResponse, noContentResponse } from '../support/helpers';

function AuthProbe() {
  const { loading, user, login, register, logout } = useAuth();

  return (
    <div>
      <p>{loading ? 'loading' : 'ready'}</p>
      <p>{user ? `${user.username}:${user.role}` : 'anonymous'}</p>
      <button type="button" onClick={() => login('casey', 'pw')}>
        login
      </button>
      <button type="button" onClick={() => register('new-user', 'pw')}>
        register
      </button>
      <button type="button" onClick={() => logout()}>
        logout
      </button>
    </div>
  );
}

function renderProvider(children: ReactNode = <AuthProbe />) {
  return render(<AuthProvider>{children}</AuthProvider>);
}

describe('AuthContext', () => {
  it('initializes the session from /auth/me and exposes the user', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(typeof input === 'string' ? input : input.toString());
      if (url.pathname.endsWith('/auth/me')) {
        return jsonResponse({
          user: { id: '1', username: 'operator', role: 'admin' }
        });
      }

      throw new Error(`Unhandled request: ${url.pathname}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    renderProvider();

    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(await screen.findByText('ready')).toBeInTheDocument();
    expect(screen.getByText('operator:admin')).toBeInTheDocument();
  });

  it('falls back to an anonymous session when /auth/me fails', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ error: 'Unauthorized' }, { status: 401 }));

    vi.stubGlobal('fetch', fetchMock);

    renderProvider();

    expect(await screen.findByText('ready')).toBeInTheDocument();
    expect(screen.getByText('anonymous')).toBeInTheDocument();
  });

  it('updates the session through login, register, and logout actions', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = typeof input === 'string' ? input : input.toString();
      const url = new URL(requestUrl);

      if (url.pathname.endsWith('/auth/me')) {
        return jsonResponse({ user: null }, { status: 401 });
      }

      if (url.pathname.endsWith('/auth/login')) {
        expect(init?.method).toBe('POST');
        expect(init?.credentials).toBe('include');
        return jsonResponse({ user: { id: '2', username: 'casey', role: 'premium' } });
      }

      if (url.pathname.endsWith('/auth/register')) {
        expect(init?.method).toBe('POST');
        return jsonResponse({ user: { id: '3', username: 'new-user', role: 'basic' } });
      }

      if (url.pathname.endsWith('/auth/logout')) {
        expect(init?.method).toBe('POST');
        return noContentResponse();
      }

      throw new Error(`Unhandled request: ${url.pathname}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    renderProvider();

    expect(await screen.findByText('ready')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'login' }));
    expect(await screen.findByText('casey:premium')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'register' }));
    expect(await screen.findByText('new-user:basic')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'logout' }));
    await waitFor(() => expect(screen.getByText('anonymous')).toBeInTheDocument());
  });
});
