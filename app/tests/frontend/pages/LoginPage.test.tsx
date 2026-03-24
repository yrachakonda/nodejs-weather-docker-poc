import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithRouter } from '../support/helpers';
import { LoginPage } from '../../../frontend/src/pages/LoginPage';

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn()
}));

vi.mock('../../../frontend/src/context/AuthContext', () => ({
  useAuth: mockUseAuth
}));

describe('LoginPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('submits credentials and navigates to the weather console on success', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue(undefined);

    mockUseAuth.mockReturnValue({ login });

    renderWithRouter(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<p>Weather Console</p>} />
      </Routes>,
      ['/login']
    );

    await user.type(screen.getByLabelText('Username'), 'operator');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(login).toHaveBeenCalledWith('operator', 'secret');
    expect(await screen.findByText('Weather Console')).toBeInTheDocument();
  });

  it('shows the user-visible error when login fails', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(new Error('Invalid credentials'));

    mockUseAuth.mockReturnValue({ login });

    renderWithRouter(<LoginPage />, ['/login']);

    await user.type(screen.getByLabelText('Username'), 'operator');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });
});
