import ProjectBackLink from './ProjectBackLink';
import ProjectSubNavTabs from './ProjectSubNavTabs';

interface ProjectPageToolbarProps {
  projectId: string;
}

export default function ProjectPageToolbar({ projectId }: ProjectPageToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <ProjectSubNavTabs projectId={projectId} />
      <ProjectBackLink />
    </div>
  );
}
