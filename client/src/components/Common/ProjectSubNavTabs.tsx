import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProjectSubNavTabsProps {
  projectId: string;
}

function tabClassName(isActive: boolean, isStagingTab: boolean): string {
  const base = 'rounded px-2.5 py-1.5 text-xs font-semibold transition text-center';
  if (isActive) {
    return [
      base,
      isStagingTab ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white',
    ].join(' ');
  }
  return `${base} border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700`;
}

export default function ProjectSubNavTabs({ projectId }: ProjectSubNavTabsProps) {
  const { effectiveRole } = useAuth();
  const location = useLocation();
  const showStaging =
    effectiveRole === 'MspAdmin' ||
    effectiveRole === 'Admin' ||
    effectiveRole === 'PIM';

  const stagingPath = `/projects/${projectId}/staging`;
  const catalogPath = `/projects/${projectId}/catalog`;

  return (
    <nav
      className="flex w-full min-w-0 items-center gap-1 rounded border border-slate-800 bg-slate-900 p-1 sm:w-auto"
      aria-label="Project phase navigation"
    >
      <NavLink
        to={catalogPath}
        className={() => `${tabClassName(location.pathname === catalogPath, false)} flex-1 sm:flex-initial`}
      >
        Catalog
      </NavLink>
      {showStaging ? (
        <NavLink
          to={stagingPath}
          className={() => `${tabClassName(location.pathname === stagingPath, true)} flex-1 sm:flex-initial`}
        >
          Staging Queue
        </NavLink>
      ) : null}
    </nav>
  );
}
