import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav>
      <Link to="/">Home</Link> | <Link to="/weather">Current Weather</Link> | <Link to="/forecast">Premium Forecast</Link>
      {user ? (
        <>
          {' '}| <span>{user.username} ({user.role})</span> <button onClick={() => logout()}>Logout</button>
        </>
      ) : (
        <>
          {' '}| <Link to="/login">Login</Link> <Link to="/register">Register</Link>
        </>
      )}
    </nav>
  );
}
