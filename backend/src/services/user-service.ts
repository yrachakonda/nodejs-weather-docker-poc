import users from '../data/seed-users.json';
import { UserRecord } from '../types';

class UserService {
  private data: UserRecord[] = [...(users as UserRecord[])];

  create(username: string, password: string): UserRecord {
    const exists = this.data.some((u) => u.username === username);
    if (exists) {
      throw new Error('USER_EXISTS');
    }
    const created: UserRecord = {
      id: `u-${this.data.length + 1}`,
      username,
      password,
      role: 'basic'
    };
    this.data.push(created);
    return created;
  }

  authenticate(username: string, password: string): UserRecord | null {
    return this.data.find((u) => u.username === username && u.password === password) || null;
  }
}

export const userService = new UserService();
