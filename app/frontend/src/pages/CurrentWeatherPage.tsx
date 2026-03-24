import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client';
import { WeatherIcon } from '../components/WeatherIcon';
import { WeatherReport } from '../types';

type CurrentWeatherPageProps = {
  location: string;
  onLocationChange: (location: string) => void;
};

const conditionThemes: Record<string, string> = {
  Sunny: 'Mostly Sunny',
  Cloudy: 'Partly Cloudy',
  Rain: 'Rain Showers',
  Snow: 'Cold Front',
  Windy: 'Wind Advisory',
  Fog: 'Low Visibility'
};

function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

function deriveFeelsLike(report: WeatherReport): number {
  return Math.round(report.temperatureC + (report.humidity / 100) * 2 - report.windKph / 12);
}

function deriveRainChance(condition: string, humidity: number): number {
  const base = condition === 'Rain' ? 70 : condition === 'Fog' ? 40 : condition === 'Cloudy' ? 28 : condition === 'Snow' ? 55 : 12;
  return Math.min(95, Math.max(base, Math.round(humidity * 0.7)));
}

export function CurrentWeatherPage({ location, onLocationChange }: CurrentWeatherPageProps) {
  const [report, setReport] = useState<WeatherReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const now = useClock();

  useEffect(() => {
    void loadWeather(location);
  }, []);

  async function loadWeather(nextLocation: string) {
    setLoading(true);
    setError('');
    const searchParams = new URLSearchParams({ location: nextLocation });

    try {
      const response = await apiRequest(`/weather/current?${searchParams.toString()}`);
      setReport(response.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateLabel = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const themeLabel = report ? conditionThemes[report.condition] || 'Live Conditions' : 'Live Conditions';

  const alertText = useMemo(() => {
    if (!report) return '';
    if (report.condition === 'Rain') return 'HEAVY RAIN ADVISORY: Expect slick roads and reduced visibility.';
    if (report.condition === 'Snow') return 'WINTER WEATHER ALERT: Travel conditions may change quickly.';
    if (report.condition === 'Windy') return 'WIND ADVISORY: Secure loose outdoor items and use caution.';
    return '';
  }, [report]);

  if (error) {
    return (
      <section className="hero-grid">
        <div className="panel panel--error">
          <p className="eyebrow">Current Weather</p>
          <h1>Unable to load weather telemetry.</h1>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  if (!report || loading) return <p className="loading-state">Loading weather telemetry...</p>;

  return (
    <section className="signage-widget">
      <div className="signage-widget__bg">
        <span className="signage-widget__orb signage-widget__orb--one" />
        <span className="signage-widget__orb signage-widget__orb--two" />
        <span className="signage-widget__orb signage-widget__orb--three" />
      </div>

      <div className="signage-topbar">
        <div className="signage-brand">
          <WeatherIcon condition="Sunny" className="signage-brand__icon" />
          <div>
            <p className="signage-brand__eyebrow">Live Display</p>
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
            void loadWeather(location);
          }}
        >
          <input
            className="signage-search__input"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="Search for a location..."
          />
          <button className="signage-search__button" type="submit">Update</button>
        </form>
      </div>

      <div className="signage-current">
        <div className="signage-current__details">
          <div className="signage-location">{report.location}</div>
          <div className="signage-temperature">{report.temperatureC}°</div>
          <div className="signage-condition">{themeLabel}</div>
        </div>
        <div className="signage-current__icon">
          <WeatherIcon condition={report.condition} className="signage-weather-icon" />
        </div>
      </div>

      <div className="signage-stats">
        <article className="signage-stat">
          <div className="signage-stat__icon">💨</div>
          <div className="signage-stat__label">Wind</div>
          <div className="signage-stat__value">{report.windKph} km/h</div>
        </article>
        <article className="signage-stat">
          <div className="signage-stat__icon">💧</div>
          <div className="signage-stat__label">Humidity</div>
          <div className="signage-stat__value">{report.humidity}%</div>
        </article>
        <article className="signage-stat">
          <div className="signage-stat__icon">🌡️</div>
          <div className="signage-stat__label">Feels Like</div>
          <div className="signage-stat__value">{deriveFeelsLike(report)}°</div>
        </article>
        <article className="signage-stat">
          <div className="signage-stat__icon">☔</div>
          <div className="signage-stat__label">Rain Chance</div>
          <div className="signage-stat__value">{deriveRainChance(report.condition, report.humidity)}%</div>
        </article>
      </div>

      <div className="signage-forecast">
        <div className="signage-forecast__title">Current Snapshot</div>
        <div className="signage-forecast__row">
          <article className="signage-forecast-card">
            <div className="signage-forecast-card__day">OUTLOOK</div>
            <div className="signage-forecast-card__icon">
              <WeatherIcon condition={report.condition} className="signage-mini-icon" />
            </div>
            <div className="signage-forecast-card__temp">{report.temperatureC}°</div>
          </article>
          <article className="signage-forecast-card">
            <div className="signage-forecast-card__day">LOCATION</div>
            <div className="signage-forecast-card__meta">{report.location}</div>
          </article>
          <article className="signage-forecast-card">
            <div className="signage-forecast-card__day">STATUS</div>
            <div className="signage-forecast-card__meta">{report.condition}</div>
          </article>
        </div>
      </div>

      {alertText ? (
        <div className="signage-alert">
          <span className="signage-alert__icon">⚠️</span>
          <span>{alertText}</span>
        </div>
      ) : null}
    </section>
  );
}
