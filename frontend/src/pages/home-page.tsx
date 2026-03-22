import { useAuth } from '../context/auth-context';

export function HomePage() {
  const { user } = useAuth();
  return <div><h1>Weather Simulation Platform</h1><p>{user ? `Logged in as ${user.username} (${user.role})` : 'Anonymous user'}</p></div>;
}
