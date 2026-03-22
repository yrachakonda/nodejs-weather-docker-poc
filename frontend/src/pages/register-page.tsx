import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

export function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState('');
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await register(String(fd.get('username')), String(fd.get('password')));
      nav('/login');
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return <form onSubmit={onSubmit}><h2>Register</h2>{error && <p>{error}</p>}<input name="username"/><input name="password" type="password"/><button>Create account</button></form>;
}
