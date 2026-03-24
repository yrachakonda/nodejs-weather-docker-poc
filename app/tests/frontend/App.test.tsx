import { ReactNode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../frontend/src/App';
import { AuthProvider } from '../../frontend/src/context/AuthContext';
import { jsonResponse } from './support/helpers';

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function buildForecast(location: string) {
  return Array.from({ length: 7 }, (_, index) => ({
    dayOffset: index,
    location,
    condition: index % 2 === 0 ? 'Rain' : 'Sunny',
    temperatureC: 12 + index,
    humidity: 60 + index,
    windKph: 14 + index
  }));
}

describe('App integration', () => {
  it('keeps the session loading state visible until auth initialization completes', async () => {
    const authRequest = deferred<Response>();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = new URL(typeof input === 'string' ? input : input.toString());
      if (url.pathname.endsWith('/auth/me')) {
        return authRequest.promise;
      }

      throw new Error(`Unhandled request: ${url.pathname}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    renderApp('/');

    expect(screen.getByText('Loading session...')).toBeInTheDocument();

    await act(async () => {
      authRequest.resolve(jsonResponse({ user: null }, { status: 401 }));
      await authRequest.promise;
    });

    expect(await screen.findByText('Sign in to view the live weather board.')).toBeInTheDocument();
  });

  it('redirects /weather to the current weather route and restores the saved cookie-backed location', async () => {
    document.cookie = 'weather-sim.location.operator=Boston; Path=/';

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl = typeof input === 'string' ? input : input.toString();
      const url = new URL(requestUrl);

      if (url.pathname.endsWith('/auth/me')) {
        return jsonResponse({
          user: { id: '1', username: 'operator', role: 'premium' }
        });
      }

      if (url.pathname.endsWith('/weather/current')) {
        const location = url.searchParams.get('location') || 'Seattle';
        return jsonResponse({
          data: {
            dayOffset: 0,
            location,
            condition: 'Sunny',
            temperatureC: 20,
            humidity: 40,
            windKph: 10
          }
        });
      }

      throw new Error(`Unhandled request: ${url.pathname}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    renderApp('/weather');

    expect(await screen.findByDisplayValue('Boston')).toBeInTheDocument();
    expect(await screen.findAllByText('Boston')).not.toHaveLength(0);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/weather/current?location=Boston'),
        expect.objectContaining({ credentials: 'include' })
      )
    );
  });

  it('shows the premium access gate for non-premium users on /forecast', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(typeof input === 'string' ? input : input.toString());
      if (url.pathname.endsWith('/auth/me')) {
        return jsonResponse({
          user: { id: '2', username: 'basic-user', role: 'basic' }
        });
      }

      throw new Error(`Unhandled request: ${url.pathname}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    renderApp('/forecast');

    expect(await screen.findByText('Premium access required.')).toBeInTheDocument();
    expect(screen.getByText(/Your current role is/i)).toHaveTextContent('basic');
  });

  it('loads the premium forecast board for premium users', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = typeof input === 'string' ? input : input.toString();
      const url = new URL(requestUrl);

      if (url.pathname.endsWith('/auth/me')) {
        return jsonResponse({
          user: { id: '3', username: 'premium-user', role: 'premium' }
        });
      }

      if (url.pathname.endsWith('/weather/premium-forecast')) {
        return jsonResponse({ data: buildForecast(url.searchParams.get('location') || 'Seattle') });
      }

      throw new Error(`Unhandled request: ${url.pathname} (${init?.method || 'GET'})`);
    });

    vi.stubGlobal('fetch', fetchMock);

    renderApp('/forecast');

    expect(await screen.findByText('7-Day Forecast')).toBeInTheDocument();
    expect(screen.getByText('Wet Days')).toBeInTheDocument();
    expect(screen.getByText('Seattle')).toBeInTheDocument();
  });
});
