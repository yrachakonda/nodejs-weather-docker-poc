import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithRouter } from '../support/helpers';
import { NavBar } from '../../../frontend/src/components/NavBar';

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn()
}));

vi.mock('../../../frontend/src/context/AuthContext', () => ({
  useAuth: mockUseAuth
}));

describe('NavBar', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('shows authentication links when no user is signed in', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      logout: vi.fn()
    });

    renderWithRouter(
      <Routes>
        <Route path="*" element={<NavBar />} />
      </Routes>,
      ['/']
    );

    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument();
  });

  it('shows the signed-in user and triggers logout', async () => {
    const user = userEvent.setup();
    const logout = vi.fn();

    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'operator', role: 'admin' },
      logout
    });

    renderWithRouter(
      <Routes>
        <Route path="*" element={<NavBar />} />
      </Routes>,
      ['/forecast']
    );

    expect(screen.getByText('operator (admin)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Logout' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
