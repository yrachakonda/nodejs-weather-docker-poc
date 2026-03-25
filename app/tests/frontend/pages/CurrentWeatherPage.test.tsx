import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../support/helpers';
import { CurrentWeatherPage } from '../../../frontend/src/pages/CurrentWeatherPage';

const { mockUseAuth, mockApiRequest } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockApiRequest: vi.fn()
}));

vi.mock('../../../frontend/src/context/AuthContext', () => ({
  useAuth: mockUseAuth
}));

vi.mock('../../../frontend/src/api/client', () => ({
  apiRequest: mockApiRequest
}));

describe('CurrentWeatherPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockApiRequest.mockReset();
  });

  it('shows the sign-in gate when the session is anonymous', () => {
    mockUseAuth.mockReturnValue({ user: null });

    renderWithRouter(<CurrentWeatherPage location="Seattle" onLocationChange={vi.fn()} />);

    expect(screen.getByText('Sign in to view the live weather board.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
  });

  it('renders weather telemetry and changes location through the search form', async () => {
    const user = userEvent.setup();
    const onLocationChange = vi.fn();

    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'operator', role: 'premium' }
    });
    mockApiRequest.mockResolvedValue({
      data: {
        dayOffset: 0,
        location: 'Seattle',
        condition: 'Rain',
        temperatureC: 11,
        humidity: 80,
        windKph: 20
      }
    });

    renderWithRouter(<CurrentWeatherPage location="Seattle" onLocationChange={onLocationChange} />);

    expect(await screen.findByText('Rain Showers')).toBeInTheDocument();
    expect(screen.getByText('HEAVY RAIN ADVISORY: Expect slick roads and reduced visibility.')).toBeInTheDocument();

    const search = screen.getByPlaceholderText('Search for a location...');
    await user.clear(search);
    await user.type(search, 'Boston');
    await user.click(screen.getByRole('button', { name: 'Update' }));

    expect(onLocationChange).toHaveBeenCalledWith('Boston');
  });

  it('shows the user-visible API error when weather loading fails', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'operator', role: 'premium' }
    });
    mockApiRequest.mockRejectedValue(new Error('Weather service unavailable'));

    renderWithRouter(<CurrentWeatherPage location="Seattle" onLocationChange={vi.fn()} />);

    expect(await screen.findByText('Unable to load weather telemetry.')).toBeInTheDocument();
    expect(screen.getByText('Weather service unavailable')).toBeInTheDocument();
  });
});
