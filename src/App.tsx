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
import OnboardingProfile from "./pages/OnboardingProfile.tsx";
import OnboardingHouseholdNew from "./pages/OnboardingHouseholdNew.tsx";
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
          {/* Onboarding flow - NEW: Individual-first */}
          <Route path="/onboarding/profile" element={<OnboardingProfile />} />
          <Route
            path="/onboarding/household"
            element={<OnboardingHouseholdNew />}
          />
          <Route path="/onboarding/preview" element={<OnboardingPreview />} />
          <Route path="/onboarding/save" element={<OnboardingSave />} />
          
          {/* Redirect old onboarding access route */}
          <Route path="/onboarding/access" element={<Navigate to="/onboarding/profile" replace />} />

          {/* Main tabs */
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
