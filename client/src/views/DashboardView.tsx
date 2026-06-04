import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWrapper, FetchWrapperError } from '../api/fetchWrapper';
import AppShellHeader from '../components/Common/AppShellHeader';
import AppShellSignOut from '../components/Common/AppShellSignOut';
import Button from '../components/Common/Button';
import Badge, { projectStatusBadgeVariant } from '../components/Common/Badge';
import Card from '../components/Common/Card';
import Input from '../components/Common/Input';
import { Spinner } from '../components/Common/Spinner';
import { useAuth } from '../context/AuthContext';

interface ProjectSummary {
  projectId: number;
  projectName: string;
  projectCity?: string | null;
  projectState?: string | null;
  projectStatus?: string;
  mspSaturnProjectRef?: number | null;
}

interface SaturnProjectOption {
  mspSaturnProjectRef: number;
  projectName: string;
  projectAddress: string | null;
  projectCity: string | null;
  projectState: string | null;
  projectZip: string | null;
  countryCode: string;
  fundingCompanyName: string | null;
  projectManagerName: string | null;
  projectManagerEmail: string | null;
  projectManagerPhone: string | null;
  projectStatus: string | null;
}

interface ProvisionFormState {
  projectName: string;
  projectAddress: string;
  projectCity: string;
  projectState: string;
  projectZip: string;
  countryCode: string;
  fundingCompanyName: string;
  purchaseOrderNumber: string;
  projectManagerName: string;
  projectManagerEmail: string;
  projectManagerPhone: string;
}

type ProjectsPayload = { projects: ProjectSummary[] };

interface SaturnProjectsPayload {
  saturnProjects: SaturnProjectOption[];
}

interface CreateProjectPayload {
  project: ProjectSummary;
}

type CreateMode = 'cleanSlate' | 'saturnImport';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_PROVISION_FORM: ProvisionFormState = {
  projectName: '',
  projectAddress: '',
  projectCity: '',
  projectState: '',
  projectZip: '',
  countryCode: 'US',
  fundingCompanyName: '',
  purchaseOrderNumber: '',
  projectManagerName: '',
  projectManagerEmail: '',
  projectManagerPhone: '',
};

function normalizeProjects(payload: ProjectsPayload): ProjectSummary[] {
  if (Array.isArray(payload.projects)) return payload.projects;
  return [];
}

function trimField(value: string): string {
  return value.trim();
}

function saturnOptionToForm(option: SaturnProjectOption): ProvisionFormState {
  return {
    projectName: trimField(option.projectName ?? ''),
    projectAddress: trimField(option.projectAddress ?? ''),
    projectCity: trimField(option.projectCity ?? ''),
    projectState: trimField(option.projectState ?? ''),
    projectZip: trimField(option.projectZip ?? ''),
    countryCode: trimField(option.countryCode ?? '') || 'US',
    fundingCompanyName: trimField(option.fundingCompanyName ?? ''),
    purchaseOrderNumber: '',
    projectManagerName: trimField(option.projectManagerName ?? ''),
    projectManagerEmail: trimField(option.projectManagerEmail ?? ''),
    projectManagerPhone: trimField(option.projectManagerPhone ?? ''),
  };
}

function isProvisionFormValid(form: ProvisionFormState): boolean {
  const identity = [
    form.projectName,
    form.projectAddress,
    form.projectCity,
    form.projectState,
    form.projectZip,
  ];
  if (identity.some((value) => !trimField(value))) return false;
  if (form.countryCode.trim().length !== 2) return false;
  if (!trimField(form.projectManagerName)) return false;
  return EMAIL_PATTERN.test(trimField(form.projectManagerEmail));
}

function buildCreateBody(
  form: ProvisionFormState,
  mspSaturnProjectRef?: number
): Record<string, string | number> {
  const body: Record<string, string | number> = {
    projectName: trimField(form.projectName),
    projectAddress: trimField(form.projectAddress),
    projectCity: trimField(form.projectCity),
    projectState: trimField(form.projectState),
    projectZip: trimField(form.projectZip),
    countryCode: trimField(form.countryCode).toUpperCase(),
    fundingCompanyName: trimField(form.fundingCompanyName),
    purchaseOrderNumber: trimField(form.purchaseOrderNumber),
    projectManagerName: trimField(form.projectManagerName),
    projectManagerEmail: trimField(form.projectManagerEmail),
    projectManagerPhone: trimField(form.projectManagerPhone),
  };
  if (mspSaturnProjectRef !== undefined) {
    body.mspSaturnProjectRef = mspSaturnProjectRef;
  }
  return body;
}

export default function DashboardView() {
  const navigate = useNavigate();
  const {
    user,
    effectiveRole,
    viewMode,
    canImpersonateClientView,
    setViewMode,
  } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createPaneOpen, setCreatePaneOpen] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>('cleanSlate');
  const [provisionForm, setProvisionForm] = useState<ProvisionFormState>(EMPTY_PROVISION_FORM);
  const [selectedSaturnRef, setSelectedSaturnRef] = useState('');
  const [saturnOptions, setSaturnOptions] = useState<SaturnProjectOption[]>([]);
  const [saturnLoading, setSaturnLoading] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const refreshProjects = useCallback(async () => {
    const payload = await fetchWrapper<ProjectsPayload>({
      endpoint: 'projects',
    });
    setProjects(normalizeProjects(payload));
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadProjects() {
      try {
        await refreshProjects();
      } catch (requestError) {
        if (!mounted) return;
        if (requestError instanceof FetchWrapperError) {
          setError(requestError.message);
        } else if (requestError instanceof Error) {
          setError(requestError.message);
        } else {
          setError('Failed to load projects.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadProjects();
    return () => {
      mounted = false;
    };
  }, [refreshProjects]);

  const showStagingQueue =
    effectiveRole === 'MspAdmin' ||
    effectiveRole === 'Admin' ||
    effectiveRole === 'PIM';

  const canProvisionProjects = showStagingQueue;
  const stagingVisible = showStagingQueue && viewMode !== 'client';

  const activeCount = useMemo(
    () => projects.filter((p) => p.projectStatus === 'Active').length,
    [projects]
  );

  const canSubmitProvision = useMemo(() => {
    if (createMode === 'saturnImport' && !selectedSaturnRef) return false;
    return isProvisionFormValid(provisionForm);
  }, [createMode, selectedSaturnRef, provisionForm]);

  const updateProvisionField = useCallback(
    (field: keyof ProvisionFormState, value: string) => {
      setProvisionForm((current) => ({ ...current, [field]: value }));
    },
    []
  );

  const selectedSaturnProject = useMemo(
    () =>
      saturnOptions.find(
        (option) => String(option.mspSaturnProjectRef) === selectedSaturnRef
      ) ?? null,
    [saturnOptions, selectedSaturnRef]
  );

  const loadSaturnOptions = useCallback(async () => {
    setSaturnLoading(true);
    setCreateError(null);
    try {
      const payload = await fetchWrapper<SaturnProjectsPayload>({
        endpoint: 'projects/saturn-available',
      });
      setSaturnOptions(payload.saturnProjects ?? []);
      if (payload.saturnProjects?.length) {
        setSelectedSaturnRef(String(payload.saturnProjects[0].mspSaturnProjectRef));
      } else {
        setSelectedSaturnRef('');
      }
    } catch (requestError) {
      if (requestError instanceof FetchWrapperError) {
        setCreateError(requestError.message);
      } else if (requestError instanceof Error) {
        setCreateError(requestError.message);
      } else {
        setCreateError('Unable to load Saturn projects.');
      }
      setSaturnOptions([]);
      setSelectedSaturnRef('');
    } finally {
      setSaturnLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!createPaneOpen || createMode !== 'saturnImport' || !canProvisionProjects) {
      return;
    }
    void loadSaturnOptions();
  }, [createPaneOpen, createMode, canProvisionProjects, loadSaturnOptions]);

  useEffect(() => {
    if (createMode !== 'saturnImport' || !selectedSaturnProject) {
      return;
    }
    setProvisionForm(saturnOptionToForm(selectedSaturnProject));
  }, [createMode, selectedSaturnProject]);

  const resetCreateForm = useCallback(() => {
    setProvisionForm(EMPTY_PROVISION_FORM);
    setSelectedSaturnRef('');
    setSaturnOptions([]);
    setCreateError(null);
    setCreateMode('cleanSlate');
  }, []);

  const handleCreateProject = useCallback(async () => {
    if (!canSubmitProvision) return;

    // Scan for identity collisions on name and city combinations
    const isDuplicate = projects.some(
      (p) =>
        p.projectName.trim().toLowerCase() === provisionForm.projectName.trim().toLowerCase() &&
        (p.projectCity || '').trim().toLowerCase() === provisionForm.projectCity.trim().toLowerCase()
    );

    if (isDuplicate) {
      setCreateError(`Operation Aborted: An active project node named "${provisionForm.projectName.trim()}" is already provisioned for ${provisionForm.projectCity.trim()}.`);
      return;
    }

    setCreateBusy(true);
    setCreateError(null);

    try {
      const saturnRef =
        createMode === 'saturnImport' ? Number(selectedSaturnRef) : undefined;
      const body = buildCreateBody(provisionForm, saturnRef);

      const response = await fetchWrapper<CreateProjectPayload>({
        endpoint: 'projects',
        method: 'POST',
        body,
      });

      if (response?.project) {
        setProjects((currentProjects) => [response.project, ...currentProjects]);
      }

      resetCreateForm();
      setCreatePaneOpen(false);
    } catch (requestError) {
      if (requestError instanceof FetchWrapperError) {
        setCreateError(requestError.message);
      } else if (requestError instanceof Error) {
        setCreateError(requestError.message);
      } else {
        setCreateError('Unable to create project.');
      }
    } finally {
      setCreateBusy(false);
    }
  }, [
    canSubmitProvision,
    createMode,
    selectedSaturnRef,
    provisionForm,
    projects,
    resetCreateForm,
  ]);

  const headerActions = (
    <>
      {canImpersonateClientView ? (
        <Button
          type="button"
          variant={viewMode === 'client' ? 'primary' : 'success'}
          aria-pressed={viewMode === 'client'}
          onClick={() => setViewMode(viewMode === 'admin' ? 'client' : 'admin')}
        >
          {viewMode === 'admin' ? 'Toggle User View' : 'Toggle Admin View'}
        </Button>
      ) : null}
      <AppShellSignOut />
    </>
  );

  return (
    <main className="min-h-screen">
      <div className="sl-app-shell">
        <AppShellHeader
          title="Project Dashboard"
          subtitle={
            <>
              {user?.email}
              {effectiveRole ? ` · ${effectiveRole}` : ''}
            </>
          }
          actions={headerActions}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
          <section className="space-y-4">
            {canImpersonateClientView && viewMode === 'client' ? (
              <p className="rounded border-l-2 border-amber-500 bg-amber-50/60 px-2 py-1.5">
                User preview is active. Staging queue actions are hidden to match client access.
              </p>
            ) : null}

            {canProvisionProjects ? (
              <div className="space-y-2">
                {!createPaneOpen ? (
                  <Button type="button" onClick={() => setCreatePaneOpen(true)}>
                    + New Project
                  </Button>
                ) : null}

                {createPaneOpen ? (
                  <div className="space-y-3 rounded border border-slate-200/70 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="uppercase tracking-wider">
                        Provision Project
                      </span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant={createMode === 'cleanSlate' ? 'primary' : 'secondary'}
                          onClick={() => {
                            setCreateMode('cleanSlate');
                            setProvisionForm(EMPTY_PROVISION_FORM);
                            setCreateError(null);
                          }}
                        >
                          Clean Slate
                        </Button>
                        <Button
                          type="button"
                          variant={createMode === 'saturnImport' ? 'primary' : 'secondary'}
                          onClick={() => {
                            setCreateMode('saturnImport');
                            setProvisionForm(EMPTY_PROVISION_FORM);
                            setCreateError(null);
                          }}
                        >
                          Saturn Import
                        </Button>
                      </div>
                    </div>

                    {createMode === 'saturnImport' ? (
                      <div className="space-y-1">
                        {saturnLoading ? (
                          <div className="flex items-center gap-1.5">
                            <Spinner size="sm" />
                            Loading Saturn registry...
                          </div>
                        ) : (
                          <label className="grid gap-0.5">
                            <span className="sl-input-label">Saturn project</span>
                            <select
                              value={selectedSaturnRef}
                              onChange={(event) => setSelectedSaturnRef(event.target.value)}
                              className="sl-input max-w-xl"
                            >
                              {saturnOptions.length === 0 ? (
                                <option value="">No available Saturn projects</option>
                              ) : (
                                saturnOptions.map((option) => (
                                  <option
                                    key={option.mspSaturnProjectRef}
                                    value={String(option.mspSaturnProjectRef)}
                                  >
                                    {option.projectName}
                                    {option.projectCity ? ` · ${option.projectCity}` : ''}
                                  </option>
                                ))
                              )}
                            </select>
                          </label>
                        )}
                        {selectedSaturnProject ? (
                          <p>
                            Hydrating from Saturn ref {selectedSaturnProject.mspSaturnProjectRef}.
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="sl-form-section-banner">1. Identity Parameters</div>
                    <div className="sl-form-section-grid">
                      <Input
                        label="Project name"
                        value={provisionForm.projectName}
                        onChange={(event) =>
                          updateProvisionField('projectName', event.target.value)
                        }
                      />
                      <Input
                        label="Street address"
                        value={provisionForm.projectAddress}
                        onChange={(event) =>
                          updateProvisionField('projectAddress', event.target.value)
                        }
                      />
                      <Input
                        label="City"
                        value={provisionForm.projectCity}
                        onChange={(event) =>
                          updateProvisionField('projectCity', event.target.value)
                        }
                      />
                      <Input
                        label="State"
                        value={provisionForm.projectState}
                        onChange={(event) =>
                          updateProvisionField('projectState', event.target.value)
                        }
                      />
                      <Input
                        label="ZIP"
                        value={provisionForm.projectZip}
                        onChange={(event) =>
                          updateProvisionField('projectZip', event.target.value)
                        }
                      />
                      <Input
                        label="Country (ISO-2)"
                        value={provisionForm.countryCode}
                        onChange={(event) =>
                          updateProvisionField('countryCode', event.target.value)
                        }
                        maxLength={2}
                      />
                    </div>

                    <div className="sl-form-section-banner">2. Financial Controls</div>
                    <div className="sl-form-section-grid">
                      <Input
                        label="Funding company"
                        value={provisionForm.fundingCompanyName}
                        onChange={(event) =>
                          updateProvisionField('fundingCompanyName', event.target.value)
                        }
                      />
                      <Input
                        label="Purchase Order (Optional)"
                        value={provisionForm.purchaseOrderNumber}
                        onChange={(event) =>
                          updateProvisionField('purchaseOrderNumber', event.target.value)
                        }
                      />
                    </div>

                    <div className="sl-form-section-banner">3. Active Coordination</div>
                    <div className="sl-form-section-grid">
                      <Input
                        label="Project manager"
                        value={provisionForm.projectManagerName}
                        onChange={(event) =>
                          updateProvisionField('projectManagerName', event.target.value)
                        }
                      />
                      <Input
                        label="PM email"
                        type="email"
                        value={provisionForm.projectManagerEmail}
                        onChange={(event) =>
                          updateProvisionField('projectManagerEmail', event.target.value)
                        }
                      />
                      <Input
                        label="PM phone"
                        value={provisionForm.projectManagerPhone}
                        onChange={(event) =>
                          updateProvisionField('projectManagerPhone', event.target.value)
                        }
                      />
                    </div>

                    {!canSubmitProvision && !createBusy ? (
                      <p>
                        Provide mandatory project metrics and contact handles to deploy asset
                        workspace.
                      </p>
                    ) : null}

                    {createError ? (
                      <p className="rounded border-l-2 border-red-500 bg-red-50/80 px-2 py-1.5">
                        {createError}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled={createBusy || !canSubmitProvision}
                        onClick={() => void handleCreateProject()}
                      >
                        {createBusy ? 'Creating...' : 'Create Project'}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={createBusy}
                        onClick={() => {
                          resetCreateForm();
                          setCreatePaneOpen(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {loading ? (
              <div className="flex items-center gap-1.5">
                <Spinner size="sm" />
                Loading project scope...
              </div>
            ) : null}

            {error ? (
              <p className="rounded border-l-2 border-red-500 bg-red-50/80 p-2">
                {error}
              </p>
            ) : null}

            {!loading && !error ? (
              <Card
                heading="Operational Project Registry"
                subheading="Scoped deployment nodes available to your identity context."
                noBodyPadding
              >
                {projects.length === 0 ? (
                  <p className="px-3 py-4">
                    No scoped projects were returned for this user.
                  </p>
                ) : (
                  <div className="space-y-1 p-2">
                    <div className="grid grid-cols-[minmax(0,1fr)_180px_104px_96px_140px] items-baseline gap-3 rounded border border-slate-200/60 bg-slate-50 px-3 py-1.5 uppercase tracking-wider select-none">
                      <span>Project</span>
                      <span className="hidden sm:block">Location</span>
                      <span className="hidden sm:block">PID</span>
                      <span className="hidden sm:block">Status</span>
                      <span className="text-right pr-2">Actions</span>
                    </div>
                    {projects.map((project) => (
                      <div
                        key={project.projectId}
                        className="grid grid-cols-[minmax(0,1fr)_180px_104px_96px_140px] items-baseline gap-3 rounded border border-slate-200/60 border-l-4 border-l-blue-600 bg-white px-3 py-2.5 transition-colors duration-150 hover:bg-slate-50"
                      >
                        <span className="truncate font-semibold">
                          {project.projectName}
                        </span>
                        <span className="hidden truncate sm:block">
                          {[project.projectCity, project.projectState]
                            .filter(Boolean)
                            .join(', ') || '—'}
                        </span>
                        <span className="hidden sm:block">
                          PID-{project.projectId}
                        </span>
                        <span className="hidden sm:inline-block">
                          <Badge variant={projectStatusBadgeVariant(project.projectStatus)}>
                            {project.projectStatus ?? 'Active'}
                          </Badge>
                        </span>
                        <div className="flex items-center justify-end gap-1 self-center">
                          <Button
                            className="shadow-none"
                            onClick={() => navigate(`/projects/${project.projectId}/catalog`)}
                          >
                            Catalog
                          </Button>
                          {stagingVisible ? (
                            <Button
                              variant="success"
                              className="shadow-none"
                              onClick={() => navigate(`/projects/${project.projectId}/staging`)}
                            >
                              Staging
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ) : null}
          </section>

          <aside className="space-y-4 rounded border border-slate-800 bg-slate-900 p-3">
            <div>
              <h2 className="font-bold uppercase tracking-wider text-slate-400">
                System Status Node
              </h2>
              <dl className="mt-2 space-y-1.5">
                <div>
                  <dt className="uppercase tracking-wider text-slate-300">Operator</dt>
                  <dd className="text-slate-200">{user?.email ?? '—'}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-slate-300">Role</dt>
                  <dd className="text-slate-200">{effectiveRole ?? '—'}</dd>
                </div>
                {canImpersonateClientView ? (
                  <div>
                    <dt className="uppercase tracking-wider text-slate-300">
                      View mode
                    </dt>
                    <dd className="capitalize text-slate-200">{viewMode}</dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <div className="border-t border-slate-800 pt-3">
              <h2 className="font-bold uppercase tracking-wider text-slate-400">
                Project Metrics
              </h2>
              <dl className="mt-2 space-y-1.5">
                <div className="flex justify-between">
                  <dt className="text-slate-300">Total scoped</dt>
                  <dd className="text-white">{projects.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-300">Active</dt>
                  <dd className="text-white">{activeCount}</dd>
                </div>
              </dl>
            </div>

            {showStagingQueue ? (
              <div className="border-t border-slate-800 pt-3">
                <h2 className="font-bold uppercase tracking-wider text-emerald-400">
                  Staging Dock
                </h2>
                <p className="mt-1 text-slate-300">
                  Global intake queues per deployment node.
                </p>
                {projects.length === 0 ? (
                  <p className="mt-2 text-slate-300">No projects in scope.</p>
                ) : (
                  <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                    {projects.map((project) => (
                      <li key={project.projectId}>
                        <button
                          type="button"
                          disabled={!stagingVisible}
                          onClick={() =>
                            navigate(`/projects/${project.projectId}/staging`)
                          }
                          className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-left transition-colors duration-150 hover:border-slate-600 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="block truncate font-semibold text-slate-200">
                            {project.projectName}
                          </span>
                          <span className="text-slate-400">
                            PID-{project.projectId}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
