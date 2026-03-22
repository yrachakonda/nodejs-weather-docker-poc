export interface SessionUser {
  id: string;
  username: string;
  role: 'basic' | 'premium' | 'admin';
}

export interface WeatherReport {
  dayOffset: number;
  city: string;
  condition: string;
  temperatureC: number;
  humidity: number;
  windKph: number;
}
