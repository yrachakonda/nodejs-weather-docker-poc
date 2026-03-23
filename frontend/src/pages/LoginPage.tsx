import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

  return (
    <section className="auth-layout">
      <form className="panel auth-card" onSubmit={onSubmit}>
        <p className="eyebrow">Account Access</p>
        <h1>Log in to the weather console.</h1>
        <p className="auth-card__copy">Use one of the seeded personas to access premium routes and session-protected flows.</p>
        {error && <p className="status-banner status-banner--error">{error}</p>}
        <label className="field">
          <span>Username</span>
          <input className="text-input" value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input className="text-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="primary-button" type="submit">Login</button>
        <p className="auth-footer">
          Need an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </section>
  );
}
