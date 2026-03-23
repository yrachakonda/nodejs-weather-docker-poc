import reports from '../data/seed-weather-reports.json';
import { WeatherReport } from '../types';

class WeatherService {
  private data = reports as Array<Omit<WeatherReport, 'location'>>;

  private createReport(template: Omit<WeatherReport, 'location'>, location: string, dayOffset = template.dayOffset): WeatherReport {
    return {
      ...template,
      dayOffset,
      location
    };
  }

  private randomTemplate(): Omit<WeatherReport, 'location'> {
    const index = Math.floor(Math.random() * this.data.length);
    return this.data[index];
  }

  current(location: string): WeatherReport {
    return this.createReport(this.randomTemplate(), location, 0);
  }

  premiumForecast(location: string): WeatherReport[] {
    return Array.from({ length: 7 }, (_value, dayOffset) => this.createReport(this.randomTemplate(), location, dayOffset));
  }
}

export const weatherService = new WeatherService();
