import { Navigate, Route, Routes } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { useAuth } from './context/AuthContext';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CurrentWeatherPage } from './pages/CurrentWeatherPage';
import { PremiumForecastPage } from './pages/PremiumForecastPage';

export default function App() {
  const { loading } = useAuth();
  if (loading) return <p>Loading session...</p>;

  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/weather" element={<CurrentWeatherPage />} />
        <Route path="/forecast" element={<PremiumForecastPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
