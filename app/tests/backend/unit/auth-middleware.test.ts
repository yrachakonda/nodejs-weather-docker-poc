import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { requireAuthenticatedPrincipal, requireRole, requireSession } from '../../../backend/src/middleware/auth';

function createRequest(overrides: Partial<Request> = {}) {
  return {
    session: {},
    header: vi.fn(),
    get: vi.fn(),
    query: {},
    method: 'GET',
    path: '/test',
    originalUrl: '/test',
    ip: '127.0.0.1',
    sessionID: 'session-id',
    ...overrides
  } as unknown as Request;
}

function createResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as unknown as Response;

  return res;
}

describe('auth middleware', () => {
  it('requireSession rejects requests without a session user', () => {
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    requireSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('requireAuthenticatedPrincipal allows either a session user or API key principal', () => {
    const sessionReq = createRequest({
      session: { user: { id: 'u-1', username: 'basicuser', role: 'basic' } } as Request['session']
    });
    const apiKeyReq = createRequest({
      apiKeyPrincipal: { owner: 'premiumuser', role: 'premium' }
    });
    const sessionRes = createResponse();
    const apiKeyRes = createResponse();
    const sessionNext = vi.fn() as NextFunction;
    const apiKeyNext = vi.fn() as NextFunction;

    requireAuthenticatedPrincipal(sessionReq, sessionRes, sessionNext);
    requireAuthenticatedPrincipal(apiKeyReq, apiKeyRes, apiKeyNext);

    expect(sessionNext).toHaveBeenCalledOnce();
    expect(apiKeyNext).toHaveBeenCalledOnce();
    expect(sessionRes.status).not.toHaveBeenCalled();
    expect(apiKeyRes.status).not.toHaveBeenCalled();
  });

  it('requireRole enforces allowed roles for session and API key principals', () => {
    const allowPremium = requireRole(['premium', 'admin']);
    const req = createRequest({
      apiKeyPrincipal: { owner: 'basicuser', role: 'basic' }
    });
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    allowPremium(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });
});
