import bcrypt from 'bcryptjs';
import users from '../data/users.json';
import { Role } from '../types/auth';

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  role: Role;
  isPremium: boolean;
}

const userStore: UserRecord[] = [...(users as UserRecord[])];

export function listUsers(): UserRecord[] {
  return userStore;
}

export function findUserByUsername(username: string): UserRecord | undefined {
  return userStore.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export async function verifyUser(username: string, password: string): Promise<UserRecord | undefined> {
  const user = findUserByUsername(username);
  if (!user) return undefined;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : undefined;
}

export async function registerUser(username: string, password: string): Promise<UserRecord> {
  const hash = await bcrypt.hash(password, 10);
  const user: UserRecord = {
    id: `u-${Date.now()}`,
    username,
    passwordHash: hash,
    role: 'basic',
    isPremium: false
  };
  userStore.push(user);
  return user;
}
