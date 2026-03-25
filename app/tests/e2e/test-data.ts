export const users = {
  basic: {
    username: 'basicuser',
    password: 'basic-pass',
    role: 'basic'
  },
  premium: {
    username: 'premiumuser',
    password: 'premium-pass',
    role: 'premium'
  },
  admin: {
    username: 'admin',
    password: 'admin-pass',
    role: 'admin'
  }
} as const;

export const locations = {
  current: 'Boston',
  premium: 'Denver'
} as const;
