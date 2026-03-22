export type Role = 'anonymous' | 'basic' | 'premium' | 'admin';

export interface SessionUser {
  id: string;
  username: string;
  role: Role;
  isPremium: boolean;
}

export interface ApiKeyRecord {
  keyId: string;
  userId: string;
  active: boolean;
  label: string;
}
