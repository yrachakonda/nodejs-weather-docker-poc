import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CurrentWeatherPage } from './pages/CurrentWeatherPage';
import { PremiumForecastPage } from './pages/PremiumForecastPage';

const DEFAULT_LOCATION = 'Seattle';
const LOCATION_STORAGE_KEY = 'weather-sim.location';

export default function App() {
  const { loading } = useAuth();
  const [location, setLocation] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_LOCATION;
    return window.sessionStorage.getItem(LOCATION_STORAGE_KEY) || DEFAULT_LOCATION;
  });

  useEffect(() => {
    window.sessionStorage.setItem(LOCATION_STORAGE_KEY, location);
  }, [location]);

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
