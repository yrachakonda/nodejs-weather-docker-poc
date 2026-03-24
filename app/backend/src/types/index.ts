export type Role = 'anonymous' | 'basic' | 'premium' | 'admin';

export interface UserRecord {
  id: string;
  username: string;
  password: string;
  role: Exclude<Role, 'anonymous'>;
}

export interface ApiKeyRecord {
  key: string;
  owner: string;
  role: Exclude<Role, 'anonymous'>;
  active: boolean;
}

export interface WeatherReport {
  dayOffset: number;
  location: string;
  condition: string;
  temperatureC: number;
  humidity: number;
  windKph: number;
}
