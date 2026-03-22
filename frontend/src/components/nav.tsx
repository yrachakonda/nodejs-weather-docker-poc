import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

export function Nav() {
  const { user, logout } = useAuth();
  return (
    <nav style={{ display: 'flex', gap: 12 }}>
      <Link to="/">Home</Link>
      <Link to="/weather">Current Weather</Link>
      <Link to="/premium">Premium Forecast</Link>
      {!user ? <><Link to="/login">Login</Link><Link to="/register">Register</Link></> : <button onClick={() => logout()}>Logout ({user.username})</button>}
    </nav>
  );
}
