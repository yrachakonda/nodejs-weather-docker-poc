import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await register(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <section className="auth-layout">
      <form className="panel auth-card" onSubmit={onSubmit}>
        <p className="eyebrow">Account Provisioning</p>
        <h1 className="auth-card__title">Create a new operator profile.</h1>
        <p className="auth-card__copy">Registration creates a session immediately, so you can continue straight into the weather console.</p>
        {error && <p className="status-banner status-banner--error">{error}</p>}
        <label className="field">
          <span>Username</span>
          <input className="text-input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input className="text-input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="primary-button" type="submit">Create account</button>
        <p className="auth-footer">
          Already registered? <Link to="/login">Login</Link>
        </p>
      </form>
    </section>
  );
}
