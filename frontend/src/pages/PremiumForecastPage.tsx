import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import { WeatherReport } from '../types';
import { useAuth } from '../context/AuthContext';

export function PremiumForecastPage() {
  const [reports, setReports] = useState<WeatherReport[]>([]);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    apiRequest('/weather/premium-forecast?city=seattle').then((r) => setReports(r.data)).catch((e) => setError(e.message));
  }, []);

  if (!user) return <p>Unauthorized</p>;
  if (!['premium', 'admin'].includes(user.role)) return <p>Forbidden: premium required.</p>;
  if (error) return <p>{error}</p>;
  return <div><h2>7 Day Forecast</h2><pre>{JSON.stringify(reports, null, 2)}</pre></div>;
}
