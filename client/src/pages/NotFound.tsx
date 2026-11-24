import { Link, Navigate, Outlet, useLocation } from "react-router";
import { Compass } from "lucide-react";
import { useAuth } from "../lib/auth";
import { Spinner } from "../components/ui";

export function NotFound({ message = "We couldn't find that page." }: { message?: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <Compass className="size-12 text-brand-500" />
      <h1 className="mt-4 text-2xl font-bold">Lost your way?</h1>
      <p className="mt-2 text-muted">{message}</p>
      <Link to="/" className="btn-primary mt-6">
        Explore stays
      </Link>
    </div>
  );
}

/** Wraps routes that need a signed-in user; sends others to log in and back. */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <Outlet />;
}
