// src/App.tsx
import { useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
} from "react-router-dom";

// Lazy-loaded page components for code splitting
const Home = lazy(() => import("./pages/Home.tsx"));
const Messages = lazy(() => import("./pages/Messages.tsx"));
const ComposePost = lazy(() => import("./pages/ComposePost.tsx"));
const SettingsNew = lazy(() => import("./pages/SettingsNew.tsx"));
const SettingsHousehold = lazy(() => import("./pages/SettingsHousehold.tsx"));
const Discovery = lazy(() => import("./pages/Discovery.tsx"));
const TestAutoJoin = lazy(() => import("./pages/TestAutoJoin.tsx"));
const Calendar = lazy(() => import("./pages/Calendar.tsx"));

// Onboarding pages
const OnboardingAccess = lazy(() => import("./pages/OnboardingAccess.tsx"));
const OnboardingAccessSimple = lazy(() => import("./pages/OnboardingAccessSimple.tsx"));
const OnboardingProfile = lazy(() => import("./pages/OnboardingProfile.tsx"));
const OnboardingAddressSimple = lazy(() => import("./pages/OnboardingAddressSimple.tsx"));
const OnboardingMagicMoment = lazy(() => import("./pages/OnboardingMagicMoment.tsx"));
const OnboardingHousehold = lazy(() => import("./pages/OnboardingHousehold"));
const OnboardingHouseholdType = lazy(() => import("./pages/OnboardingHouseholdType.tsx").then(m => ({ default: m.OnboardingHouseholdType })));
const OnboardingKids = lazy(() => import("./pages/OnboardingKids.tsx").then(m => ({ default: m.OnboardingKids })));
const OnboardingPrivacy = lazy(() => import("./pages/OnboardingPrivacy.tsx").then(m => ({ default: m.OnboardingPrivacy })));
const OnboardingPreview = lazy(() => import("./pages/OnboardingPreview.tsx"));
const OnboardingSave = lazy(() => import("./pages/OnboardingSave.tsx"));
const PublicRSVP = lazy(() => import("./pages/PublicRSVP.tsx"));
const PublicEventPage = lazy(() => import("./pages/PublicEventPage.tsx"));

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
          <NavLink to="/discovery" className={linkClass}>
            Discover
          </NavLink>
          <NavLink to="/calendar" className={linkClass}>
            Calendar
          </NavLink>
          <NavLink to="/me" className={linkClass}>
            Me
          </NavLink>
        </nav>
      )}

      <main style={{ padding: isOnboarding ? 0 : 16 }}>
        <Suspense fallback={<div style={{ padding: 16, textAlign: 'center' }}>Loading…</div>}>
          <Routes>
            {/* Onboarding flow - V15: OAuth → Location → Household Type → Kids (if family) → Privacy → Magic Moment → Save */}
            <Route path="/onboarding/access" element={<OnboardingAccess />} />
            <Route path="/onboarding/access-simple" element={<OnboardingAccessSimple />} />
            <Route path="/onboarding/profile" element={<OnboardingProfile />} />
            <Route path="/onboarding/address" element={<OnboardingAddressSimple />} />
            <Route path="/onboarding/magical-moment" element={<Navigate to="/onboarding/magic-moment" replace />} />
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
            {/* Public event share links - :eventId is the event's UUID */}
            <Route path="/e/:eventId" element={<PublicEventPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
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
