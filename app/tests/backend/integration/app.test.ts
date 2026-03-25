import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../../../backend/src/app';

describe('Express API integration', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('system routes', () => {
    it('serves live, ready, health, and version responses', async () => {
      const [live, ready, health, version] = await Promise.all([
        request(app).get('/api/v1/system/live'),
        request(app).get('/api/v1/system/ready'),
        request(app).get('/api/v1/system/health'),
        request(app).get('/api/v1/system/version')
      ]);

      expect(live.status).toBe(200);
      expect(live.body).toEqual({ status: 'ok' });

      expect(ready.status).toBe(200);
      expect(ready.body).toEqual({ status: 'ready' });

      expect(health.status).toBe(200);
      expect(health.body).toEqual({ status: 'healthy' });

      expect(version.status).toBe(200);
      expect(version.body).toEqual({ version: 'test-version' });
    });
  });

  describe('auth routes', () => {
    it('registers a user and creates a session that /me can read', async () => {
      const agent = request.agent(app);
      const username = `new-user-${Date.now()}`;

      const registerResponse = await agent
        .post('/api/v1/auth/register')
        .send({ username, password: 'strong-pass' });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body).toEqual({
        user: {
          id: expect.any(String),
          username,
          role: 'basic'
        }
      });
      expect(registerResponse.headers['set-cookie']).toBeDefined();

      const meResponse = await agent.get('/api/v1/auth/me');

      expect(meResponse.status).toBe(200);
      expect(meResponse.body).toEqual(registerResponse.body);
    });

    it('rejects duplicate registration', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ username: 'basicuser', password: 'basic-pass' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid credentials' });
    });

    it('rejects invalid auth payloads', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ username: 'ab', password: '123' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid request' });
    });

    it('logs in a seeded user, exposes /me, and clears the session on logout', async () => {
      const agent = request.agent(app);

      const loginResponse = await agent
        .post('/api/v1/auth/login')
        .send({ username: 'premiumuser', password: 'premium-pass' });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toEqual({
        user: {
          id: 'u-premium',
          username: 'premiumuser',
          role: 'premium'
        }
      });

      const meResponse = await agent.get('/api/v1/auth/me');

      expect(meResponse.status).toBe(200);
      expect(meResponse.body).toEqual(loginResponse.body);

      const logoutResponse = await agent.post('/api/v1/auth/logout');

      expect(logoutResponse.status).toBe(204);

      const afterLogout = await agent.get('/api/v1/auth/me');

      expect(afterLogout.status).toBe(401);
      expect(afterLogout.body).toEqual({ error: 'Unauthorized' });
    });

    it('rejects invalid login attempts', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'premiumuser', password: 'wrong-pass' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid credentials' });
    });

    it('requires a session for /logout and /me', async () => {
      const [logoutResponse, meResponse] = await Promise.all([
        request(app).post('/api/v1/auth/logout'),
        request(app).get('/api/v1/auth/me')
      ]);

      expect(logoutResponse.status).toBe(401);
      expect(logoutResponse.body).toEqual({ error: 'Unauthorized' });

      expect(meResponse.status).toBe(401);
      expect(meResponse.body).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('weather routes', () => {
    it('rejects current weather without a session or API key', async () => {
      const response = await request(app).get('/api/v1/weather/current');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('allows current weather with a valid session', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/v1/auth/login')
        .send({ username: 'basicuser', password: 'basic-pass' })
        .expect(200);

      const response = await agent.get('/api/v1/weather/current?location=Boston');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: {
          dayOffset: 0,
          location: 'Boston',
          condition: 'Sunny',
          temperatureC: 5,
          humidity: 40,
          windKph: 5
        }
      });
    });

    it('allows current weather with a valid API key', async () => {
      const response = await request(app)
        .get('/api/v1/weather/current?location=Miami')
        .set('x-api-key', 'poc-basic-key-001');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: {
          dayOffset: 0,
          location: 'Miami',
          condition: 'Sunny',
          temperatureC: 5,
          humidity: 40,
          windKph: 5
        }
      });
    });

    it('treats an invalid API key as unauthorized', async () => {
      const response = await request(app)
        .get('/api/v1/weather/current')
        .set('x-api-key', 'not-a-real-key');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('rejects premium forecast for a basic session', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/v1/auth/login')
        .send({ username: 'basicuser', password: 'basic-pass' })
        .expect(200);

      const response = await agent.get('/api/v1/weather/premium-forecast');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Forbidden' });
    });

    it('rejects premium forecast for a basic API key', async () => {
      const response = await request(app)
        .get('/api/v1/weather/premium-forecast')
        .set('x-api-key', 'poc-basic-key-001');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Forbidden' });
    });

    it('allows premium forecast for a premium session', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/v1/auth/login')
        .send({ username: 'premiumuser', password: 'premium-pass' })
        .expect(200);

      const response = await agent.get('/api/v1/weather/premium-forecast?location=Denver');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(7);
      expect(response.body.data).toEqual([
        {
          dayOffset: 0,
          location: 'Denver',
          condition: 'Sunny',
          temperatureC: 5,
          humidity: 40,
          windKph: 5
        },
        {
          dayOffset: 1,
          location: 'Denver',
          condition: 'Sunny',
          temperatureC: 5,
          humidity: 40,
          windKph: 5
        },
        {
          dayOffset: 2,
          location: 'Denver',
          condition: 'Sunny',
          temperatureC: 5,
          humidity: 40,
          windKph: 5
        },
        {
          dayOffset: 3,
          location: 'Denver',
          condition: 'Sunny',
          temperatureC: 5,
          humidity: 40,
          windKph: 5
        },
        {
          dayOffset: 4,
          location: 'Denver',
          condition: 'Sunny',
          temperatureC: 5,
          humidity: 40,
          windKph: 5
        },
        {
          dayOffset: 5,
          location: 'Denver',
          condition: 'Sunny',
          temperatureC: 5,
          humidity: 40,
          windKph: 5
        },
        {
          dayOffset: 6,
          location: 'Denver',
          condition: 'Sunny',
          temperatureC: 5,
          humidity: 40,
          windKph: 5
        }
      ]);
    });

    it('allows premium forecast for a premium API key without a session', async () => {
      const response = await request(app)
        .get('/api/v1/weather/premium-forecast?location=Seattle')
        .set('x-api-key', 'poc-premium-key-001');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(7);
      expect(response.body.data[0]).toEqual({
        dayOffset: 0,
        location: 'Seattle',
        condition: 'Sunny',
        temperatureC: 5,
        humidity: 40,
        windKph: 5
      });
      expect(response.body.data[6]).toEqual({
        dayOffset: 6,
        location: 'Seattle',
        condition: 'Sunny',
        temperatureC: 5,
        humidity: 40,
        windKph: 5
      });
    });
  });
});
