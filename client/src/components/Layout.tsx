import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { Home, LogOut, Luggage, Menu, Plus } from "lucide-react";
import { useAuth } from "../lib/auth";
import { Avatar, useToast } from "./ui";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-brand-500" aria-label="Nestly home">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="8" fill="currentColor" />
        <path d="M8 17.5 16 10l8 7.5V24a1 1 0 0 1-1 1h-4.5v-5h-5v5H9a1 1 0 0 1-1-1z" fill="#fff" />
      </svg>
      <span className="hidden text-xl font-extrabold tracking-tight sm:inline">nestly</span>
    </Link>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const toast = useToast();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-50";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-line py-1.5 pl-3 pr-1.5 transition hover:shadow-md"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Menu className="size-4" />
        {user ? <Avatar name={user.name} url={user.avatarUrl} size={30} /> : <span className="size-[30px] rounded-full bg-gray-500" />}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-40 w-60 overflow-hidden rounded-2xl border border-line bg-white py-2 shadow-xl">
          {user ? (
            <>
              <div className="border-b border-line px-4 pb-2.5 pt-1">
                <div className="text-sm font-semibold">{user.name}</div>
                <div className="truncate text-xs text-muted">{user.email}</div>
              </div>
              <Link role="menuitem" to="/trips" className={item}>
                <Luggage className="size-4" /> My trips
              </Link>
              <Link role="menuitem" to="/host" className={item}>
                <Home className="size-4" /> Host dashboard
              </Link>
              <Link role="menuitem" to="/host/listings/new" className={item}>
                <Plus className="size-4" /> List a new stay
              </Link>
              <button
                role="menuitem"
                className={`${item} border-t border-line`}
                onClick={async () => {
                  await logout();
                  toast("success", "You're logged out.");
                  navigate("/");
                }}
              >
                <LogOut className="size-4" /> Log out
              </button>
            </>
          ) : (
            <>
              <Link role="menuitem" to="/signup" className={`${item} font-semibold`}>
                Sign up
              </Link>
              <Link role="menuitem" to="/login" className={item}>
                Log in
              </Link>
              <Link role="menuitem" to="/host" className={`${item} border-t border-line`}>
                Host your home
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="flex items-center gap-1">
            {user && (
              <NavLink
                to="/trips"
                className={({ isActive }) => `btn-ghost hidden rounded-full md:inline-flex ${isActive ? "bg-gray-100" : ""}`}
              >
                Trips
              </NavLink>
            )}
            <NavLink to="/host" className={({ isActive }) => `btn-ghost hidden rounded-full sm:inline-flex ${isActive ? "bg-gray-100" : ""}`}>
              {user ? "Hosting" : "Host your home"}
            </NavLink>
            <UserMenu />
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="mt-16 border-t border-line bg-gray-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} Nestly · A portfolio project by Aman Kumar</span>
          <a href="https://github.com/aman01k/airbnb-clone" className="font-medium text-ink hover:underline">
            Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
