export interface SessionUser {
  id: string;
  username: string;
  role: 'anonymous' | 'basic' | 'premium' | 'admin';
  isPremium: boolean;
}

export interface WeatherReport {
  city: string;
  date: string;
  condition: string;
  temperatureC: number;
  humidity: number;
  windKph: number;
}
