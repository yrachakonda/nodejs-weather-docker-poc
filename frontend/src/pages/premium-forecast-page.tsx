import { useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/auth-context';
import { WeatherReport } from '../types';

export function PremiumForecastPage() {
  const { user } = useAuth();
  const [city, setCity] = useState('Seattle');
  const [data, setData] = useState<WeatherReport[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const reports = await apiFetch<WeatherReport[]>(`/weather/premium/forecast?city=${encodeURIComponent(city)}`, { headers: { 'x-api-key': user?.isPremium ? 'premium-key-123' : 'basic-key-123' } });
      setData(reports);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!user) return <p>Please login to access premium forecast.</p>;
  return <div><h2>Premium Forecast</h2><p>{user.isPremium ? 'Premium access enabled' : 'You are not premium and should receive 403.'}</p><input value={city} onChange={(e)=>setCity(e.target.value)} /><button onClick={load}>Load forecast</button>{error && <p>{error}</p>}{data.length>0 && <pre>{JSON.stringify(data,null,2)}</pre>}</div>;
}
