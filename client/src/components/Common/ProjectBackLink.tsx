import { useNavigate } from 'react-router-dom';
import Button from './Button';

export default function ProjectBackLink() {
  const navigate = useNavigate();

  return (
    <Button type="button" variant="primary" className="w-full sm:w-auto" onClick={() => navigate('/dashboard')}>
      Back to Dashboard
    </Button>
  );
}
