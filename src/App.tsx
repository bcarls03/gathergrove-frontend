import { Link, Outlet } from "react-router-dom";

export default function App() {
  return (
    <div className="min-h-screen">
      <nav style={{display:"flex", gap:12, padding:16, borderBottom:"1px solid #eee"}}>
        <Link to="/">Home</Link>
        <Link to="/people">People</Link>
        <Link to="/settings">Settings</Link>
      </nav>
      <main style={{padding:16}}>
        <Outlet />
      </main>
    </div>
  );
}
