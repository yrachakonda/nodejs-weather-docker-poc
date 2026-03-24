import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function NavBar() {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <p className="eyebrow">Atmospheric Control Center</p>
        <NavLink to="/" className="brand-mark">
          WeatherScope
        </NavLink>
      </div>
      <nav className="topbar__nav">
        <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`} end>
          Current Weather
        </NavLink>
        <NavLink to="/forecast" className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}>
          Premium Forecast
        </NavLink>
      </nav>
      <div className="topbar__auth">
        {user ? (
          <>
            <div className="user-pill" data-testid="user-pill">
              <span className="user-pill__label">Signed In</span>
              <span>{user.username} ({user.role})</span>
            </div>
            <button className="ghost-button" data-testid="logout-button" onClick={() => logout()}>Logout</button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`} data-testid="login-link">
              Login
            </NavLink>
            <span className="nav-divider">|</span>
            <NavLink to="/register" className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}>
              Register
            </NavLink>
          </>
        )}
      </div>
    </header>
  );
}
