import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('premiumuser');
  const [password, setPassword] = useState('premium-pass');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return <form onSubmit={onSubmit}><h2>Login</h2>{error && <p>{error}</p>}<input value={username} onChange={(e)=>setUsername(e.target.value)} /><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} /><button type="submit">Login</button></form>;
}
