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
import Messages from "./pages/Messages.tsx";
import ComposePost from "./pages/ComposePost.tsx";
import SettingsNew from "./pages/SettingsNew.tsx";
import SettingsHousehold from "./pages/SettingsHousehold.tsx";
import Discovery from "./pages/Discovery.tsx";
import TestAutoJoin from "./pages/TestAutoJoin.tsx";
import Calendar from "./pages/Calendar.tsx";

// ⬇️ NOTE: all default imports, no curly braces
import OnboardingAccess from "./pages/OnboardingAccess.tsx";
import OnboardingAccessSimple from "./pages/OnboardingAccessSimple.tsx";
import OnboardingProfile from "./pages/OnboardingProfile.tsx";
import OnboardingAddressSimple from "./pages/OnboardingAddressSimple.tsx";
import OnboardingMagicalMoment from "./pages/OnboardingMagicalMoment.tsx";
import OnboardingMagicMoment from "./pages/OnboardingMagicMoment.tsx";
import OnboardingHousehold from "./pages/OnboardingHousehold";
import { OnboardingHouseholdType } from "./pages/OnboardingHouseholdType.tsx";
import { OnboardingKids } from "./pages/OnboardingKids.tsx";
import { OnboardingPrivacy } from "./pages/OnboardingPrivacy.tsx";
import OnboardingPreview from "./pages/OnboardingPreview.tsx";
import OnboardingSave from "./pages/OnboardingSave.tsx";
import PublicRSVP from "./pages/PublicRSVP.tsx";

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
            position: "sticky",
            top: 0,
            backgroundColor: "#ffffff",
            zIndex: 100,
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
          <NavLink to="/" className={linkClass} end>
            Home
          </NavLink>
          <NavLink to="/calendar" className={linkClass}>
            Calendar
          </NavLink>
          <NavLink to="/discovery" className={linkClass}>
            Discover
          </NavLink>
          <NavLink to="/me" className={linkClass}>
            Me
          </NavLink>
        </nav>
      )}

      <main style={{ padding: isOnboarding ? 0 : 16 }}>
        <Routes>
          {/* Onboarding flow - V15: OAuth → Location → Household Type → Kids (if family) → Privacy → Magic Moment → Save */}
          <Route path="/onboarding/access" element={<OnboardingAccess />} />
          <Route path="/onboarding/access-simple" element={<OnboardingAccessSimple />} />
          <Route path="/onboarding/profile" element={<OnboardingProfile />} />
          <Route path="/onboarding/address" element={<OnboardingAddressSimple />} />
          <Route path="/onboarding/magical-moment" element={<OnboardingMagicalMoment />} />
          <Route path="/onboarding/magic-moment" element={<OnboardingMagicMoment />} />
          <Route
            path="/onboarding/household"
            element={<OnboardingHouseholdType />}
          />
          <Route path="/onboarding/household-old" element={<OnboardingHousehold />} />
          <Route path="/onboarding/kids" element={<OnboardingKids />} />
          <Route path="/onboarding/privacy" element={<OnboardingPrivacy />} />
          {/* Redirect old profile route to new OAuth access route */}
          <Route path="/onboarding/profile-old" element={<OnboardingProfile />} />

          <Route path="/onboarding/preview" element={<OnboardingPreview />} />
          <Route path="/onboarding/save" element={<OnboardingSave />} />

          {/* Main tabs */}
          <Route path="/" element={<Home />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/discovery" element={<Discovery />} />
          <Route path="/me" element={<SettingsNew />} />
          <Route path="/me/household" element={<SettingsHousehold />} />
          {/* Redirect old routes to /me */}
          <Route path="/settings" element={<Navigate to="/me" replace />} />
          <Route path="/settings/household" element={<Navigate to="/me/household" replace />} />
          <Route path="/profile" element={<Navigate to="/me" replace />} />

          {/* Hidden-from-nav routes */}
          <Route path="/messages" element={<Messages />} />
          <Route path="/compose/:kind" element={<ComposePost />} />
          <Route path="/compose/:kind/:id" element={<ComposePost />} />
          <Route path="/test-autojoin" element={<TestAutoJoin />} />
          
          {/* Public RSVP - No authentication required */}
          <Route path="/rsvp/:token" element={<PublicRSVP />} />

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
