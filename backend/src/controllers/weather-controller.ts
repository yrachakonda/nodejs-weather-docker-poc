import { Request, Response } from 'express';
import { weatherService } from '../services/weather-service';

export const getCurrent = (req: Request, res: Response): void => {
  const city = String(req.query.city || 'seattle').toLowerCase();
  res.json({ data: weatherService.current(city) });
};

export const getPremiumForecast = (req: Request, res: Response): void => {
  const city = String(req.query.city || 'seattle').toLowerCase();
  res.json({ data: weatherService.premiumForecast(city) });
};
