import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithRouter } from '../support/helpers';
import { RegisterPage } from '../../../frontend/src/pages/RegisterPage';

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn()
}));

vi.mock('../../../frontend/src/context/AuthContext', () => ({
  useAuth: mockUseAuth
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('creates an account and navigates to the weather console on success', async () => {
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue(undefined);

    mockUseAuth.mockReturnValue({ register });

    renderWithRouter(
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<p>Weather Console</p>} />
      </Routes>,
      ['/register']
    );

    await user.type(screen.getByLabelText('Username'), 'new-user');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(register).toHaveBeenCalledWith('new-user', 'secret');
    expect(await screen.findByText('Weather Console')).toBeInTheDocument();
  });

  it('shows the user-visible error when registration fails', async () => {
    const user = userEvent.setup();
    const register = vi.fn().mockRejectedValue(new Error('Username already exists'));

    mockUseAuth.mockReturnValue({ register });

    renderWithRouter(<RegisterPage />, ['/register']);

    await user.type(screen.getByLabelText('Username'), 'existing-user');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Username already exists')).toBeInTheDocument();
  });
});
