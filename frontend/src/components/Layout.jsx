import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bell, Search, Settings as SettingsIcon, LogOut, Activity, LayoutDashboard, Bot, ListChecks, BarChart3 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import useMissionWebSocket from "@/lib/ws";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agents", label: "Agents", icon: Bot },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [wsConnected, setWsConnected] = useState(false);
  const [notif, setNotif] = useState(2);

  // Tiny global ping so the connection dot updates everywhere
  useMissionWebSocket((evt) => {
    if (evt.type === "metrics.update") setWsConnected(true);
  });
  useEffect(() => {
    const t = setTimeout(() => setWsConnected(true), 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-3" data-testid="brand-link">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div className="font-mono-display text-lg font-extrabold tracking-tight">
              MISSION<span className="text-blue-400">·</span>CONTROL
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-6">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                data-testid={`nav-${n.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    isActive ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                <n.icon className="w-4 h-4" />
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex-1" />

          <div className="hidden lg:flex items-center relative">
            <Search className="w-4 h-4 absolute left-3 text-gray-500" />
            <Input
              data-testid="header-search-input"
              placeholder="Search agents, tasks, logs..."
              className="pl-9 w-72 bg-white/5 border-white/10 placeholder:text-gray-500 focus-visible:ring-blue-500/40"
            />
          </div>

          <button
            data-testid="header-notifications-btn"
            className="relative w-10 h-10 rounded-md hover:bg-white/5 grid place-items-center text-gray-300"
            onClick={() => setNotif(0)}
          >
            <Bell className="w-5 h-5" />
            {notif > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-blue-500 text-white text-[10px] font-bold rounded-full grid place-items-center">
                {notif}
              </span>
            )}
          </button>

          <button
            data-testid="header-settings-btn"
            onClick={() => navigate("/settings")}
            className="w-10 h-10 rounded-md hover:bg-white/5 grid place-items-center text-gray-300"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>

          <div
            data-testid="connection-status"
            className={`flex items-center gap-2 px-3 h-9 rounded-md border ${
              wsConnected ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            <span className={`pulse-dot w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-400" : "bg-red-400"}`}></span>
            <span className="text-[11px] font-mono-display tracking-wider uppercase">{wsConnected ? "LINK" : "OFFLINE"}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-white/10">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 grid place-items-center text-xs font-bold">
              {user?.name?.[0] || "C"}
            </div>
            <Button
              data-testid="logout-btn"
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-gray-400 hover:text-white hover:bg-white/5"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* mobile nav */}
        <div className="md:hidden flex overflow-x-auto gap-1 px-4 pb-2">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-xs whitespace-nowrap ${isActive ? "bg-white/10" : "text-gray-400"}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
