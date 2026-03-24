import { Request } from 'express';

function sanitizeQuery(query: Request['query']): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      result[key] = value.map((entry) => String(entry));
      continue;
    }

    result[key] = String(value);
  }

  return result;
}

export function getRequestLogContext(req: Request) {
  const sessionUser = req.session.user;
  const apiKeyPrincipal = req.apiKeyPrincipal;
  const requestId = req.header('x-correlation-id');

  return {
    requestId,
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    sessionId: req.sessionID,
    authType: sessionUser ? 'session' : apiKeyPrincipal ? 'apiKey' : 'anonymous',
    userId: sessionUser?.id || null,
    username: sessionUser?.username || apiKeyPrincipal?.owner || null,
    role: sessionUser?.role || apiKeyPrincipal?.role || 'anonymous',
    query: sanitizeQuery(req.query)
  };
}
