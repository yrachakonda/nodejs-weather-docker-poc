import { useAuth } from '../context/AuthContext';

export function HomePage() {
  const { user } = useAuth();
  return <div><h1>Weather Simulation Platform</h1><p>{user ? `Logged in as ${user.username}` : 'Please login to continue.'}</p></div>;
}
