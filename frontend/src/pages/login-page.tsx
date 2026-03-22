import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState('');
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await login(String(fd.get('username')), String(fd.get('password')));
      nav('/');
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return <form onSubmit={onSubmit}><h2>Login</h2>{error && <p>{error}</p>}<input name="username" placeholder="username"/><input name="password" type="password" placeholder="password"/><button>Login</button></form>;
}
