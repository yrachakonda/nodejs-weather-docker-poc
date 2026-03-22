import { useState } from 'react';
import { apiFetch } from '../api/client';
import { WeatherReport } from '../types';

export function CurrentWeatherPage() {
  const [city, setCity] = useState('Seattle');
  const [report, setReport] = useState<WeatherReport | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await apiFetch<WeatherReport>(`/weather/current?city=${encodeURIComponent(city)}`, { headers: { 'x-api-key': 'basic-key-123' } });
      setReport(data);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return <div><h2>Current Weather</h2><input value={city} onChange={(e)=>setCity(e.target.value)} /><button onClick={load}>Load</button>{error && <p>{error}</p>}{report && <pre>{JSON.stringify(report,null,2)}</pre>}</div>;
}
