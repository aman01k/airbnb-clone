import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ErrorBox, FieldError, Spinner, useToast } from "../components/ui";

/** Only allow redirects to paths inside this app. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function useAuthForm() {
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setSubmitting(true);
    setError(null);
    setFields({});
    try {
      await fn();
    } catch (e) {
      if (e instanceof ApiError && e.details) setFields(e.details);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };
  return { error, fields, submitting, run };
}

export function Login() {
  const { user, loading, login } = useAuth();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const next = safeNext(sp.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const form = useAuthForm();

  if (loading) return <Spinner />;
  if (user) return <Navigate to={next} replace />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    form.run(async () => {
      const u = await login(email, password);
      toast("success", `Welcome back, ${u.name.split(" ")[0]}!`);
      navigate(next, { replace: true });
    });
  };

  return (
    <AuthShell
      title="Log in"
      subtitle={
        <>
          New to Nestly?{" "}
          <Link to={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-ink underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {form.error && <ErrorBox message={form.error} />}
        <label className="block">
          <span className="label">Email</span>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <FieldError message={form.fields.email} />
        </label>
        <label className="block">
          <span className="label">Password</span>
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <FieldError message={form.fields.password} />
        </label>
        <button className="btn-primary w-full py-3" disabled={form.submitting}>
          {form.submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm">
        <p className="font-semibold">Just looking around?</p>
        <p className="mt-1 text-muted">Use a demo account. Both use the password <code className="font-mono text-ink">password123</code>.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { label: "Demo guest", email: "guest@nestly.dev" },
            { label: "Demo host", email: "host@nestly.dev" },
          ].map((d) => (
            <button
              key={d.email}
              type="button"
              className="chip bg-white"
              onClick={() => {
                setEmail(d.email);
                setPassword("password123");
              }}
            >
              Fill in {d.label.toLowerCase()}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}

export function Signup() {
  const { user, loading, register } = useAuth();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const next = safeNext(sp.get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const form = useAuthForm();

  if (loading) return <Spinner />;
  if (user) return <Navigate to={next} replace />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    form.run(async () => {
      const u = await register(name, email, password);
      toast("success", `Welcome to Nestly, ${u.name.split(" ")[0]}!`);
      navigate(next, { replace: true });
    });
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        <>
          Already have one?{" "}
          <Link to={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-ink underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {form.error && <ErrorBox message={form.error} />}
        <label className="block">
          <span className="label">Full name</span>
          <input className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
          <FieldError message={form.fields.name} />
        </label>
        <label className="block">
          <span className="label">Email</span>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <FieldError message={form.fields.email} />
        </label>
        <label className="block">
          <span className="label">Password</span>
          <input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
          <FieldError message={form.fields.password} />
        </label>
        <button className="btn-primary w-full py-3" disabled={form.submitting}>
          {form.submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>
    </AuthShell>
  );
}
