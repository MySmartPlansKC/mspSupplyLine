import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FetchWrapperError } from '../api/fetchWrapper';
import Button from '../components/Common/Button';
import Input from '../components/Common/Input';
import Logo from '../components/Common/Logo';
import { useAuth } from '../context/AuthContext';

function toDisplayError(error: unknown): string {
  if (error instanceof FetchWrapperError) {
    if (error.status === 401) return 'Invalid email or password.';
    if (error.status === 400) return 'Please provide a valid email and password.';
    return error.message || 'Login failed.';
  }
  return 'Unable to sign in.';
}

export default function LoginView() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('mspadmin@supplyline.local');
  const [password, setPassword] = useState('SupplyLine123!');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await login(email, password);
      const redirect = (location.state as { from?: string } | null)?.from;
      navigate(redirect ?? '/dashboard', { replace: true });
    } catch (error) {
      setErrorMessage(toDisplayError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen font-sans text-slate-900 antialiased">
      {/* LEFT SIDE PANEL: INDUSTRIAL INFORMATION BRANDING */}
      <section className="relative hidden w-1/2 select-none flex-col justify-between overflow-hidden border-r border-slate-800 bg-slate-900 p-12 lg:flex text-slate-100">
        <div className="pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 rounded-full bg-emerald-600/10 blur-3xl" />

        <div className="relative z-10">
          <Logo showText theme="dark" size="loginDesktop" />
        </div>

        {/* MISSION SUB-TEXT */}
        <div className="relative z-10 my-auto max-w-md space-y-4">
          <div>
            <span className="inline-block rounded border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 font-semibold uppercase tracking-wider text-blue-400">
              Enterprise Asset Registry
            </span>
          </div>
          <h2 className="font-bold leading-tight tracking-tight text-slate-100">
            Autonomous catalog tracking built for multi-tenant property deployments.
          </h2>
          <p className="leading-relaxed text-slate-400">
            Verify structural inventory component specifications, lead times, and required installation
            logistics from a single secure operations node.
          </p>
        </div>

        {/* CORE FOOTER CONTRACT */}
        <div className="relative z-10 font-semibold uppercase tracking-wider text-slate-500">
          MySmartPlans Core Engine &bull; v1.2.0
        </div>
      </section>

      {/* RIGHT SIDE PANEL: INTERACTIVE AUTHENTICATION GATEWAY */}
      <section className="flex w-full flex-col justify-center px-6 sm:px-12 md:px-24 lg:w-1/2 xl:px-36">
        <div className="mx-auto w-full max-w-sm space-y-6">
          
          <div className="mb-2 lg:hidden">
            <Logo showText theme="light" size="loginMobile" />
          </div>

          {/* SECTION HEADER BLOCK */}
          <div className="border-b border-slate-200 pb-4 space-y-2">
            <h1 className="font-bold uppercase tracking-wider text-slate-900">
              Gateway Authentication
            </h1>
            <p className="font-semibold text-slate-500">
              Secure context access token validation required.
            </p>
          </div>

          {/* SECURE IDENTITY FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <Input
                label="Security Identity (Email)"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 transition-colors"
                required
              />

              <Input
                label="Access Key (Password)"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 transition-colors"
                required
              />
            </div>

            {/* ERROR NOTIFICATION PANEL */}
            {errorMessage ? (
              <div className="rounded border border-red-200 bg-red-50 p-4 font-semibold text-red-800">
                {errorMessage}
              </div>
            ) : null}

            {/* COMPOSITE FORM BUTTON TARGET */}
            <Button
              type="submit"
              disabled={submitting}
              loading={submitting}
              className="h-11 w-full cursor-pointer rounded font-bold uppercase tracking-wider shadow-sm select-none"
              variant={submitting ? 'success' : 'primary'}
            >
              {submitting ? 'Verifying Context...' : 'Authenticate'}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}