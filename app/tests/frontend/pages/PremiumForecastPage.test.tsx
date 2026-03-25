import { screen } from '@testing-library/react';
import { renderWithRouter } from '../support/helpers';
import { PremiumForecastPage } from '../../../frontend/src/pages/PremiumForecastPage';

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

describe('PremiumForecastPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockApiRequest.mockReset();
  });

  it('shows the sign-in gate when the user is anonymous', () => {
    mockUseAuth.mockReturnValue({ user: null });

    renderWithRouter(<PremiumForecastPage location="Seattle" onLocationChange={vi.fn()} />);

    expect(screen.getByText('Sign in to unlock the seven-day board.')).toBeInTheDocument();
  });

  it('shows the upgrade gate for basic users', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'basic-user', role: 'basic' }
    });

    renderWithRouter(<PremiumForecastPage location="Seattle" onLocationChange={vi.fn()} />);

    expect(screen.getByText('Premium access required.')).toBeInTheDocument();
    expect(screen.getByText(/basic/i)).toBeInTheDocument();
  });

  it('renders the premium forecast summary for premium users', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'premium-user', role: 'premium' }
    });
    mockApiRequest.mockResolvedValue({
      data: [
        { dayOffset: 0, location: 'Seattle', condition: 'Rain', temperatureC: 10, humidity: 80, windKph: 20 },
        { dayOffset: 1, location: 'Seattle', condition: 'Sunny', temperatureC: 14, humidity: 60, windKph: 18 },
        { dayOffset: 2, location: 'Seattle', condition: 'Snow', temperatureC: 5, humidity: 85, windKph: 16 }
      ]
    });

    renderWithRouter(<PremiumForecastPage location="Seattle" onLocationChange={vi.fn()} />);

    expect(await screen.findByText('7-Day Forecast')).toBeInTheDocument();
    expect(screen.getByText('Average Temp')).toBeInTheDocument();
    expect(screen.getByText('Wet Days')).toBeInTheDocument();
    expect(screen.getByText('Seattle')).toBeInTheDocument();
  });

  it('shows the user-visible API error when premium forecast loading fails', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'premium-user', role: 'premium' }
    });
    mockApiRequest.mockRejectedValue(new Error('Premium forecast unavailable'));

    renderWithRouter(<PremiumForecastPage location="Seattle" onLocationChange={vi.fn()} />);

    expect(await screen.findByText('Unable to load forecast telemetry.')).toBeInTheDocument();
    expect(screen.getByText('Premium forecast unavailable')).toBeInTheDocument();
  });
});
