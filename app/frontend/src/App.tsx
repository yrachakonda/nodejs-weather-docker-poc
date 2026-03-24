import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CurrentWeatherPage } from './pages/CurrentWeatherPage';
import { PremiumForecastPage } from './pages/PremiumForecastPage';

const DEFAULT_LOCATION = 'Seattle';
const LOCATION_COOKIE_PREFIX = 'weather-sim.location';
const LOCATION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function getLocationCookieKey(username?: string) {
  return `${LOCATION_COOKIE_PREFIX}.${username || 'guest'}`;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const prefix = `${encodeURIComponent(name)}=`;
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(prefix));

  if (!match) return null;
  return decodeURIComponent(match.slice(prefix.length));
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${LOCATION_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

export default function App() {
  const { loading, user } = useAuth();
  const [location, setLocation] = useState(DEFAULT_LOCATION);

  useEffect(() => {
    if (loading) return;

    const storedLocation = readCookie(getLocationCookieKey(user?.username));
    setLocation(storedLocation || DEFAULT_LOCATION);
  }, [loading, user?.username]);

  useEffect(() => {
    if (loading) return;
    writeCookie(getLocationCookieKey(user?.username), location);
  }, [loading, location, user?.username]);

  if (loading) return <p className="loading-state">Loading session...</p>;

  return (
    <div className="app-shell">
      <div className="app-shell__glow app-shell__glow--one" />
      <div className="app-shell__glow app-shell__glow--two" />
      <NavBar />
      <main className="page-shell">
        <Routes>
          <Route path="/" element={<CurrentWeatherPage location={location} onLocationChange={setLocation} />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/weather" element={<Navigate to="/" replace />} />
          <Route path="/forecast" element={<PremiumForecastPage location={location} onLocationChange={setLocation} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
