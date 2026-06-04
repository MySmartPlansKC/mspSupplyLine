import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShellHeader from '../components/Common/AppShellHeader';
import AppShellSignOut from '../components/Common/AppShellSignOut';
import ProjectBackLink from '../components/Common/ProjectBackLink';
import ProjectSubNavTabs from '../components/Common/ProjectSubNavTabs';
import { fetchWrapper } from '../api/fetchWrapper';
import Button from '../components/Common/Button';
import Card from '../components/Common/Card';
import LoadingIndicator from '../components/Common/LoadingIndicator';

interface DependencyItem {
  relationshipId: string;
  primaryItemId: string;
  relatedItemId: string;
  relationType: 'RequiredForInstall' | 'OptionalUpgrade' | 'DirectSubstitute';
  notes: string | null;
  relatedManufacturer: string;
  relatedModelNumber: string;
  relatedItemDescription: string | null;
}

interface InventoryItem {
  inventoryId: string;
  projectId: number;
  itemId: string;
  quantity: number;
  locationInBuilding: string;
  manufacturer: string;
  modelNumber: string;
  itemDescription: string | null;
  specs: unknown;
  manufacturerUrl: string | null;
  estimatedUnitPrice: number | null;
  currencyCode: string | null;
  estimatedLeadTimeDays: number | null;
  dependencies: DependencyItem[];
}

interface InventoryPayload {
  inventory: InventoryItem[];
}

function parseSpecs(specs: unknown): Record<string, unknown> {
  if (!specs) return {};
  if (typeof specs === 'string') {
    try {
      return JSON.parse(specs) as Record<string, unknown>;
    } catch {
      return { raw: specs };
    }
  }
  return specs as Record<string, unknown>;
}

function formatPrice(value: number | null, currencyCode: string | null): string {
  if (value === null) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode ?? 'USD',
  }).format(value);
}

export default function CatalogView() {
  const { projectId = '' } = useParams();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadInventory() {
      try {
        const payload = await fetchWrapper<InventoryPayload>({
          endpoint: `projects/${projectId}/inventory`,
        });
        if (!mounted) return;
        setInventory(payload.inventory ?? []);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load project inventory.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadInventory();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  const rows = useMemo(() => {
    return inventory.map((item) => {
      const specs = parseSpecs(item.specs);
      const specEntries = Object.entries(specs);

      return (
        <div
          key={item.inventoryId}
          className="grid grid-cols-1 items-baseline gap-2 border-b border-slate-200/70 border-l-2 border-l-blue-600 p-3 transition-colors last:border-b-0 hover:bg-slate-50/50 lg:grid-cols-12"
        >
          <div className="space-y-1 lg:col-span-4">
            <div className="flex items-center gap-2">
              <span className="rounded border border-slate-200/70 bg-slate-100 px-1">
                ID: {item.itemId.slice(0, 8)}
              </span>
              <h3 className="font-semibold tracking-tight">
                {item.manufacturer} &bull; {item.modelNumber}
              </h3>
            </div>
            {item.itemDescription ? (
              <p className="line-clamp-2 leading-normal">{item.itemDescription}</p>
            ) : null}
            <div className="flex items-center gap-3 pt-0.5">
              <span>Qty: {item.quantity}</span>
              <span>|</span>
              <span>Location: {item.locationInBuilding}</span>
            </div>
          </div>

          <div className="space-y-1 border-t border-slate-200/70 pt-2 lg:col-span-3 lg:border-t-0 lg:pt-0">
            <span className="block uppercase tracking-wider">Logistics Metrics</span>
            <div className="flex justify-between">
              <span>Est. Unit Price:</span>
              <span>{formatPrice(item.estimatedUnitPrice, item.currencyCode)}</span>
            </div>
            <div className="flex justify-between">
              <span>Lead Time:</span>
              <span>{item.estimatedLeadTimeDays ?? 0} days</span>
            </div>
            {item.manufacturerUrl ? (
              <Button variant="link" className="mt-1">
                <a href={item.manufacturerUrl} target="_blank" rel="noreferrer">
                  Open Manufacturer Spec Sheet &rarr;
                </a>
              </Button>
            ) : null}
          </div>

          <div className="border-t border-slate-200/70 pt-2 lg:col-span-3 lg:border-t-0 lg:pt-0">
            <span className="mb-1 block uppercase tracking-wider">Configuration Parameters</span>
            {specEntries.length === 0 ? (
              <span className="italic">No parameters available</span>
            ) : (
              <div className="grid max-h-24 grid-cols-2 gap-x-2 gap-y-0.5 overflow-y-auto pr-1">
                {specEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="truncate border-b border-slate-100 pb-0.5 last:border-0"
                    title={`${key}: ${String(value)}`}
                  >
                    {key}: {String(value)}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex min-h-[40px] flex-col justify-center border-t border-slate-200/70 pt-2 lg:col-span-2 lg:border-t-0 lg:pt-0">
            {item.dependencies.length > 0 ? (
              <div className="space-y-1 rounded border-l-2 border-amber-500 bg-amber-50/60 px-2 py-1.5">
                <div className="flex items-center gap-1 uppercase tracking-wide">
                  <span>⚠️</span> Dependency Alert ({item.dependencies.length})
                </div>
                <div className="space-y-0.5">
                  {item.dependencies.map((dep) => (
                    <div
                      key={dep.relationshipId}
                      className="truncate"
                      title={`${dep.relationType}: ${dep.relatedManufacturer} ${dep.relatedModelNumber}`}
                    >
                      &bull; {dep.relatedModelNumber}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <span className="w-full text-center italic">No active alerts</span>
            )}
          </div>
        </div>
      );
    });
  }, [inventory]);

  return (
    <main className="min-h-screen">
      <div className="sl-app-shell">
        <AppShellHeader
          title="Project Asset Control Matrix"
          subtitle={`System Context Node: PID-${projectId}`}
          actions={<AppShellSignOut />}
        />

        <ProjectSubNavTabs projectId={projectId} />

        <ProjectBackLink />

        {loading ? (
          <LoadingIndicator
            label="Aggregating multi-tenant registry assets..."
            spinnerSize="sm"
          />
        ) : null}

        {error ? (
          <div className="rounded border-l-2 border-red-500 bg-red-50/80 p-2">
            Operational Exception Intercepted: {error}
          </div>
        ) : null}

        {!loading && !error ? (
          <Card
            heading="Active Verified Inventory Ledger"
            subheading="System-of-record parameters for deployment tracking hardware rows."
            className="overflow-hidden"
            noBodyPadding
          >
            {inventory.length === 0 ? (
              <p className="px-3 py-4 text-center italic">
                No active asset registries allocated to this operational node.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-slate-200/70 border-t border-slate-200/70">
                <div className="hidden items-baseline gap-2 px-3 py-1.5 uppercase tracking-wider select-none lg:grid lg:grid-cols-12">
                  <span className="lg:col-span-4">Asset Identity</span>
                  <span className="lg:col-span-3">Logistics</span>
                  <span className="lg:col-span-3">Configuration</span>
                  <span className="lg:col-span-2">Dependencies</span>
                </div>
                {rows}
              </div>
            )}
          </Card>
        ) : null}
      </div>
    </main>
  );
}
