import { Request, Response } from 'express';
import { weatherService } from '../services/weather-service';

function getRequestedLocation(req: Request): string {
  const rawLocation = req.query.location;
  if (typeof rawLocation !== 'string') return 'seattle';

  const location = rawLocation.trim();
  return location.length > 0 ? location : 'seattle';
}

export const getCurrent = (req: Request, res: Response): void => {
  const location = getRequestedLocation(req);
  res.json({ data: weatherService.current(location) });
};

export const getPremiumForecast = (req: Request, res: Response): void => {
  const location = getRequestedLocation(req);
  res.json({ data: weatherService.premiumForecast(location) });
};
