import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/auth-context';
import { Nav } from './components/nav';
import { HomePage } from './pages/home-page';
import { LoginPage } from './pages/login-page';
import { RegisterPage } from './pages/register-page';
import { CurrentWeatherPage } from './pages/current-weather-page';
import { PremiumForecastPage } from './pages/premium-forecast-page';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/weather" element={<CurrentWeatherPage />} />
          <Route path="/premium" element={<PremiumForecastPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
