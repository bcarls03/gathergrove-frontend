// src/App.tsx
import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
} from "react-router-dom";

import Home from "./pages/Home.tsx";
import People from "./pages/People.tsx";
import Messages from "./pages/Messages.tsx";
import ComposePost from "./pages/ComposePost.tsx";
import Settings from "./pages/Settings.tsx";

// ⬇️ NOTE: all default imports, no curly braces
import OnboardingAccess from "./pages/OnboardingAccess.tsx";
import OnboardingHousehold from "./pages/OnboardingHousehold.tsx";
import OnboardingPreview from "./pages/OnboardingPreview.tsx";
import OnboardingSave from "./pages/OnboardingSave.tsx";

// Push notifications (Capacitor)
import { initPushNotifications } from "./lib/notifications";

function AppShell() {
  const location = useLocation();
  const isOnboarding = location.pathname.startsWith("/onboarding");

  // Initialize push notifications once on app shell mount
  useEffect(() => {
    initPushNotifications();
  }, []);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "px-2 py-1 rounded-md",
      isActive ? "bg-black text-white" : "text-black hover:bg-gray-100",
    ].join(" ");

  return (
    <div className="min-h-screen">
      {/* Top nav is hidden during onboarding flow */}
      {!isOnboarding && (
        <nav
          style={{
            display: "flex",
            gap: 12,
            padding: 16,
            borderBottom: "1px solid #eee",
            flexWrap: "wrap",
          }}
        >
          <NavLink to="/" className={linkClass} end>
            Home
          </NavLink>
          <NavLink to="/people" className={linkClass}>
            People
          </NavLink>
          <NavLink to="/settings" className={linkClass}>
            Settings
          </NavLink>
        </nav>
      )}

      <main style={{ padding: isOnboarding ? 0 : 16 }}>
        <Routes>
          {/* Onboarding flow */}
          <Route path="/onboarding/access" element={<OnboardingAccess />} />
          <Route
            path="/onboarding/household"
            element={<OnboardingHousehold />}
          />
          <Route path="/onboarding/preview" element={<OnboardingPreview />} />
          <Route path="/onboarding/save" element={<OnboardingSave />} />

          {/* Main tabs */}
          <Route path="/" element={<Home />} />
          <Route path="/people" element={<People />} />
          <Route path="/settings" element={<Settings />} />

          {/* Hidden-from-nav routes */}
          <Route path="/messages" element={<Messages />} />
          <Route path="/compose/:kind" element={<ComposePost />} />
          <Route path="/compose/:kind/:id" element={<ComposePost />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
