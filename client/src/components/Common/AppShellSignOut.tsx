import Button from './Button';
import { useAuth } from '../../context/AuthContext';

export default function AppShellSignOut() {
  const { logout } = useAuth();

  return (
    <Button type="button" onClick={logout} variant="danger" size="sm" className="whitespace-nowrap">
      Sign out
    </Button>
  );
}
