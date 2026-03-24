import { Request, Response } from 'express';
import { weatherService } from '../services/weather-service';
import { logger } from '../config/logger';
import { getRequestLogContext } from '../utils/request-log-context';

function getRequestedLocation(req: Request): string {
  const rawLocation = req.query.location;
  if (typeof rawLocation !== 'string') return 'seattle';

  const location = rawLocation.trim();
  return location.length > 0 ? location : 'seattle';
}

export const getCurrent = (req: Request, res: Response): void => {
  const location = getRequestedLocation(req);
  const report = weatherService.current(location);
  logger.info('weather_current_served', {
    requestedLocation: location,
    condition: report.condition,
    temperatureC: report.temperatureC,
    ...getRequestLogContext(req)
  });
  res.json({ data: report });
};

export const getPremiumForecast = (req: Request, res: Response): void => {
  const location = getRequestedLocation(req);
  const forecast = weatherService.premiumForecast(location);
  logger.info('weather_premium_forecast_served', {
    requestedLocation: location,
    forecastDays: forecast.length,
    firstCondition: forecast[0]?.condition || null,
    ...getRequestLogContext(req)
  });
  res.json({ data: forecast });
};
