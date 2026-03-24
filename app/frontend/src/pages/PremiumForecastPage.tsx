import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { WeatherIcon } from '../components/WeatherIcon';
import { useAuth } from '../context/AuthContext';
import { WeatherReport } from '../types';

type PremiumForecastPageProps = {
  location: string;
  onLocationChange: (location: string) => void;
};

function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

function getDayLabel(dayOffset: number) {
  const day = new Date();
  day.setDate(day.getDate() + dayOffset);
  return day.toLocaleDateString([], { weekday: 'short' }).toUpperCase();
}

function deriveSummary(reports: WeatherReport[]) {
  if (reports.length === 0) return { avgTemp: 0, maxWind: 0, rainDays: 0, avgHumidity: 0 };

  const avgTemp = Math.round(reports.reduce((sum, item) => sum + item.temperatureC, 0) / reports.length);
  const maxWind = Math.max(...reports.map((item) => item.windKph));
  const rainDays = reports.filter((item) => item.condition === 'Rain' || item.condition === 'Snow').length;
  const avgHumidity = Math.round(reports.reduce((sum, item) => sum + item.humidity, 0) / reports.length);

  return { avgTemp, maxWind, rainDays, avgHumidity };
}

export function PremiumForecastPage({ location, onLocationChange }: PremiumForecastPageProps) {
  const [reports, setReports] = useState<WeatherReport[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const now = useClock();

  useEffect(() => {
    void loadForecast(location);
  }, []);

  async function loadForecast(nextLocation: string) {
    setLoading(true);
    setError('');
    const searchParams = new URLSearchParams({ location: nextLocation });

    try {
      const response = await apiRequest(`/weather/premium-forecast?${searchParams.toString()}`);
      setReports(response.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateLabel = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const summary = useMemo(() => deriveSummary(reports), [reports]);

  if (!user) {
    return (
      <section className="auth-layout">
        <div className="panel auth-card">
          <p className="eyebrow">Premium Forecast</p>
          <h1>Sign in to unlock the seven-day board.</h1>
          <p className="auth-card__copy">Premium forecasting is reserved for authenticated premium or admin accounts.</p>
          <div className="auth-card__actions">
            <Link className="primary-button" to="/login">Login</Link>
            <Link className="ghost-button ghost-button--link" to="/register">Register</Link>
          </div>
        </div>
      </section>
    );
  }

  if (!['premium', 'admin'].includes(user.role)) {
    return (
      <section className="auth-layout">
        <div className="panel auth-card">
          <p className="eyebrow">Premium Forecast</p>
          <h1>Premium access required.</h1>
          <p className="auth-card__copy">Your current role is <strong>{user.role}</strong>. Upgrade to premium access to retrieve the extended forecast simulation.</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="hero-grid">
        <div className="panel panel--error">
          <p className="eyebrow">Premium Forecast</p>
          <h1>Unable to load forecast telemetry.</h1>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  if (loading) return <p className="loading-state">Loading premium forecast...</p>;

  return (
    <section className="signage-widget signage-widget--forecast">
      <div className="signage-widget__bg">
        <span className="signage-widget__orb signage-widget__orb--one" />
        <span className="signage-widget__orb signage-widget__orb--two" />
        <span className="signage-widget__orb signage-widget__orb--three" />
      </div>

      <div className="signage-topbar">
        <div className="signage-brand">
          <WeatherIcon condition="Cloudy" className="signage-brand__icon" />
          <div>
            <p className="signage-brand__eyebrow">Premium Board</p>
            <span className="signage-brand__title">Metro Weather</span>
          </div>
        </div>
        <div className="signage-clock">
          <div className="signage-clock__time">{timeLabel}</div>
          <div className="signage-clock__date">{dateLabel}</div>
        </div>
      </div>

      <div className="signage-search">
        <form
          className="signage-search__form"
          onSubmit={(e) => {
            e.preventDefault();
            void loadForecast(location);
          }}
        >
          <input
            className="signage-search__input"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="Search for a location..."
          />
          <button className="signage-search__button" type="submit">Load Forecast</button>
        </form>
      </div>

      <div className="signage-current signage-current--forecast">
        <div className="signage-current__details">
          <div className="signage-location">{location}</div>
          <div className="signage-temperature">{summary.avgTemp}°</div>
          <div className="signage-condition">7-Day Forecast Window</div>
        </div>
        <div className="signage-current__icon">
          <WeatherIcon condition={reports[0]?.condition || 'Cloudy'} className="signage-weather-icon" />
        </div>
      </div>

      <div className="signage-stats">
        <article className="signage-stat">
          <div className="signage-stat__icon">🌡️</div>
          <div className="signage-stat__label">Average Temp</div>
          <div className="signage-stat__value">{summary.avgTemp}°</div>
        </article>
        <article className="signage-stat">
          <div className="signage-stat__icon">💨</div>
          <div className="signage-stat__label">Peak Wind</div>
          <div className="signage-stat__value">{summary.maxWind} km/h</div>
        </article>
        <article className="signage-stat">
          <div className="signage-stat__icon">☔</div>
          <div className="signage-stat__label">Wet Days</div>
          <div className="signage-stat__value">{summary.rainDays}</div>
        </article>
        <article className="signage-stat">
          <div className="signage-stat__icon">💧</div>
          <div className="signage-stat__label">Avg Humidity</div>
          <div className="signage-stat__value">{summary.avgHumidity}%</div>
        </article>
      </div>

      <div className="signage-forecast">
        <div className="signage-forecast__title">7-Day Forecast</div>
        <div className="signage-forecast__row signage-forecast__row--scroll">
          {reports.map((entry) => (
            <article className="signage-forecast-card signage-forecast-card--full" key={`${entry.location}-${entry.dayOffset}-${entry.condition}-${entry.temperatureC}`}>
              <div className="signage-forecast-card__day">{getDayLabel(entry.dayOffset)}</div>
              <div className="signage-forecast-card__icon">
                <WeatherIcon condition={entry.condition} className="signage-mini-icon" />
              </div>
              <div className="signage-forecast-card__temp">{entry.temperatureC}°</div>
              <div className="signage-forecast-card__meta">{entry.condition}</div>
              <div className="signage-forecast-card__stats">
                <span>Wind {entry.windKph} km/h</span>
                <span>Humidity {entry.humidity}%</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
