import 'express-session';
import { ApiKeyPrincipal, Role } from './index';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      role: Exclude<Role, 'anonymous'>;
    };
  }
}

declare global {
  namespace Express {
    interface Request {
      apiKeyPrincipal?: ApiKeyPrincipal;
    }
  }
}
