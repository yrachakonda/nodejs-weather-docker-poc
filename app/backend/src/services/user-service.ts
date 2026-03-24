import users from '../data/seed-users.json';
import { UserRecord } from '../types';
import { hashSecret, verifySecret } from '../utils/secret-hash';

const DUMMY_PASSWORD_HASH = 'scrypt$00000000000000000000000000000000$0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

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
      passwordHash: hashSecret(password),
      role: 'basic'
    };
    this.data.push(created);
    return created;
  }

  authenticate(username: string, password: string): UserRecord | null {
    const user = this.data.find((candidate) => candidate.username === username);
    if (!user) {
      verifySecret(password, DUMMY_PASSWORD_HASH);
      return null;
    }

    return verifySecret(password, user.passwordHash) ? user : null;
  }
}

export const userService = new UserService();
