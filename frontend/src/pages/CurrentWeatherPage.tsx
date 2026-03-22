import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import { WeatherReport } from '../types';

export function CurrentWeatherPage() {
  const [report, setReport] = useState<WeatherReport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/weather/current?city=seattle').then((r) => setReport(r.data)).catch((e) => setError(e.message));
  }, []);

  if (error) return <p>{error}</p>;
  if (!report) return <p>Loading...</p>;
  return <div><h2>Current Weather</h2><pre>{JSON.stringify(report, null, 2)}</pre></div>;
}
