import Button from './Button';
import { useDevLoadingPreview } from '../../context/DevLoadingPreviewContext';

export default function DevLoadingPreviewToggle() {
  const { previewLoading, togglePreviewLoading } = useDevLoadingPreview();

  return (
    <Button
      type="button"
      variant={previewLoading ? 'success' : 'secondary'}
      size="sm"
      onClick={togglePreviewLoading}
      title="Toggle loading spinner preview (dev only)"
    >
      {previewLoading ? 'Loading preview on' : 'Preview loading'}
    </Button>
  );
}
