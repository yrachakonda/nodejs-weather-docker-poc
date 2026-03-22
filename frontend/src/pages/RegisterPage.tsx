import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('newuser1');
  const [password, setPassword] = useState('newpass1');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await register(username, password);
    navigate('/');
  }

  return <form onSubmit={onSubmit}><h2>Register</h2><input value={username} onChange={(e)=>setUsername(e.target.value)} /><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} /><button type="submit">Create account</button></form>;
}
