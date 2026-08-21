import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  ChevronDown,
  UserCircle,
  Settings,
  LogOut,
  Bell,
} from "lucide-react";

export default function TopNavbar({ onMenuClick }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Get user from localStorage saved during login
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const fullName = user?.full_name || "Researcher";
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Notifications
  const [notesOpen, setNotesOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotes = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const r = await fetch(
          "http://localhost:8000/api/v1/users/me/notifications",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (r.ok) setNotifications(await r.json());
      } catch (e) {}
    };
    fetchNotes();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setDropdownOpen(false);
    navigate("/login");
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          <Menu className="h-5 w-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-semibold text-slate-800 hidden sm:block">
          Ethical Research Assistant
        </h1>
      </div>

      {/* Right */}
      <div className="relative" ref={dropdownRef}>
        <div className="absolute left-4 top-3">
          <button
            onClick={() => setNotesOpen((s) => !s)}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            <Bell className="h-5 w-5 text-slate-600" />
          </button>
          {notesOpen && (
            <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 p-2 z-50 shadow-lg">
              <h4 className="text-sm font-semibold px-2">Notifications</h4>
              <ul className="mt-2 space-y-2 max-h-64 overflow-auto">
                {notifications.length === 0 && (
                  <li className="text-xs text-slate-500 px-2">
                    No notifications
                  </li>
                )}
                {notifications.map((n) => (
                  <li key={n.id} className="p-2 border rounded bg-white">
                    <div className="text-sm">{n.type}</div>
                    {n.type === "invite" && (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={async () => {
                            const token = localStorage.getItem("token");
                            const res = await fetch(
                              `http://localhost:8000/api/v1/projects/${n.payload.project_id}/invites/${n.payload.invite_id}/respond`,
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({ action: "accept" }),
                              },
                            );
                            if (res.ok)
                              setNotifications((prev) =>
                                prev.filter((x) => x.id !== n.id),
                              );
                          }}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                        >
                          Accept
                        </button>
                        <button
                          onClick={async () => {
                            const token = localStorage.getItem("token");
                            const res = await fetch(
                              `http://localhost:8000/api/v1/projects/${n.payload.project_id}/invites/${n.payload.invite_id}/respond`,
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({ action: "reject" }),
                              },
                            );
                            if (res.ok)
                              setNotifications((prev) =>
                                prev.filter((x) => x.id !== n.id),
                              );
                          }}
                          className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                        >
                          Reject
                        </button>
                        <a
                          href={n.payload?.link}
                          className="ml-auto text-xs text-blue-600 underline"
                        >
                          Open
                        </a>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
        >
          {/* Avatar with dynamic initials */}
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center shadow-sm">
            <span className="text-sm font-semibold text-white">{initials}</span>
          </div>

          {/* Dynamic name */}
          <span className="text-sm font-medium text-slate-700 hidden sm:block">
            {fullName}
          </span>

          <motion.div
            animate={{ rotate: dropdownOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </motion.div>
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-xl rounded-xl border border-slate-200/80 shadow-xl shadow-slate-200/50 py-1 z-50"
            >
              {/* User info at top of dropdown */}
              <div className="px-4 py-2.5 border-b border-slate-100 mb-1">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {fullName}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.email || ""}
                </p>
              </div>

              <Link
                to="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <UserCircle className="h-4 w-4 text-slate-400" />
                Profile
              </Link>

              <Link
                to="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Settings className="h-4 w-4 text-slate-400" />
                Settings
              </Link>

              <hr className="my-1 border-slate-100" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
