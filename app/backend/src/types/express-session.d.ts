import 'express-session';
import { Role } from './index';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      role: Exclude<Role, 'anonymous'>;
    };
  }
}
