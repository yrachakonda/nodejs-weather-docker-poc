import reports from '../data/weather-reports.json';
import { WeatherReport } from '../types/weather';

const weather = reports as WeatherReport[];

export function getCurrent(city: string): WeatherReport | undefined {
  return weather.find((w) => w.city.toLowerCase() === city.toLowerCase());
}

export function getForecast(city: string): WeatherReport[] {
  return weather.filter((w) => w.city.toLowerCase() === city.toLowerCase()).slice(0, 7);
}
