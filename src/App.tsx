// src/App.tsx
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home.tsx";
import People from "./pages/People.tsx";
import Messages from "./pages/Messages.tsx";
import ComposePost from "./pages/ComposePost.tsx";
import PreviewEvent from "./pages/PreviewEvent.tsx"; // 👈 Event preview
import Settings from "./pages/Settings.tsx";        // 👈 use the real Settings page

export default function App() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "px-2 py-1 rounded-md",
      isActive ? "bg-black text-white" : "text-black hover:bg-gray-100",
    ].join(" ");

  return (
    <BrowserRouter>
      <div className="min-h-screen">
        {/* Top nav — only 3 tabs: Home, People, Settings */}
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

        <main style={{ padding: 16 }}>
          <Routes>
            {/* Main tabs */}
            <Route path="/" element={<Home />} />
            <Route path="/people" element={<People />} />
            <Route path="/settings" element={<Settings />} />

            {/* Hidden-from-nav routes */}
            <Route path="/messages" element={<Messages />} />
            <Route path="/compose/:kind" element={<ComposePost />} />
            {/* ✏️ Edit route for existing posts */}
            <Route path="/compose/:kind/:id" element={<ComposePost />} />
            <Route path="/preview-event" element={<PreviewEvent />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
