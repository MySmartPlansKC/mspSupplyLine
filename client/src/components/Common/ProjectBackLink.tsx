import { useNavigate } from 'react-router-dom';
import Button from './Button';

export default function ProjectBackLink() {
  const navigate = useNavigate();

  return (
    <div className="flex justify-end">
      <Button type="button" variant="primary" onClick={() => navigate('/dashboard')}>
        Back to Dashboard
      </Button>
    </div>
  );
}
