import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { AuthProvider } from "./lib/auth";
import { ApiError } from "./lib/api";
import { Layout } from "./components/Layout";
import { ToastProvider } from "./components/ui";
import { Home } from "./pages/Home";
import { ListingPage } from "./pages/ListingPage";
import { Login, Signup } from "./pages/Auth";
import { Trips } from "./pages/Trips";
import { HostDashboard } from "./pages/Host";
import { ListingFormPage } from "./pages/ListingForm";
import { NotFound, RequireAuth } from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Don't retry requests the server rejected on purpose.
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="listings/:id" element={<ListingPage />} />
                <Route path="login" element={<Login />} />
                <Route path="signup" element={<Signup />} />
                <Route element={<RequireAuth />}>
                  <Route path="trips" element={<Trips />} />
                  <Route path="host" element={<HostDashboard />} />
                  <Route path="host/listings/new" element={<ListingFormPage />} />
                  <Route path="host/listings/:id/edit" element={<ListingFormPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
