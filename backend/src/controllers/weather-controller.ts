import { Request, Response } from 'express';
import { getCurrent, getForecast } from '../services/weather-service';

export function currentWeather(req: Request, res: Response): void {
  const city = String(req.query.city ?? 'Seattle');
  const report = getCurrent(city);
  if (!report) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'City not found' } });
    return;
  }
  res.json({ data: report });
}

export function premiumForecast(req: Request, res: Response): void {
  const city = String(req.query.city ?? 'Seattle');
  const reports = getForecast(city);
  res.json({ data: reports });
}
