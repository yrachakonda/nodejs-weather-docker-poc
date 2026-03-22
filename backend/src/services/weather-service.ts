import reports from '../data/seed-weather-reports.json';
import { WeatherReport } from '../types';

class WeatherService {
  private data: WeatherReport[] = reports as WeatherReport[];

  current(city: string): WeatherReport {
    return this.data.find((r) => r.city === city && r.dayOffset === 0) || this.data[0];
  }

  premiumForecast(city: string): WeatherReport[] {
    return this.data.filter((r) => r.city === city).slice(0, 7);
  }
}

export const weatherService = new WeatherService();
