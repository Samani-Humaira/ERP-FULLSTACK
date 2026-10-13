import { motion, AnimatePresence } from "framer-motion";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  FileText,
  GitCompareArrows,
  ClipboardPen,
  UserCircle,
  LogOut,
  GraduationCap,
  X,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/research", label: "Start Research", icon: Search },
  { to: "/papers", label: "Papers", icon: FileText },
  { to: "/gap-analysis", label: "Gap Analysis", icon: GitCompareArrows },
  { to: "/proposal", label: "Proposal", icon: ClipboardPen },
  { to: "/profile", label: "Profile", icon: UserCircle },
];

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white/95 backdrop-blur-xl border-r border-slate-200/80 shadow-[8px_0_32px_-24px_rgba(15,23,42,0.35)]
          flex flex-col
          transform lg:translate-x-0 lg:static lg:z-auto
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="h-[76px] flex items-center justify-between px-5 border-b border-slate-100">
          <NavLink to="/dashboard" className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-primary-600 to-violet-600 rounded-xl shadow-md shadow-primary-500/25">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="min-w-0">
              <span className="block font-bold leading-tight text-slate-900">
                Research Studio
              </span>
              <span className="mt-1 block text-[9px] font-semibold tracking-[0.18em] text-slate-400">
                ETHICAL RESEARCH ASSISTANT
              </span>
            </span>
          </NavLink>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-5 w-5 text-slate-500 dark:text-slate-300" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 overflow-y-auto">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>
          <div className="space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => {
              const isActive =
                location.pathname === to ||
                (to !== "/dashboard" && location.pathname.startsWith(`${to}/`));
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? "text-primary-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-50 to-violet-50/70 ring-1 ring-primary-100/80"
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 30,
                      }}
                    />
                  )}
                  <Icon
                    className={`relative z-10 h-[18px] w-[18px] shrink-0 ${isActive ? "text-primary-600" : "text-slate-400"}`}
                  />
                  <span className="relative z-10">{label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-slate-100 bg-slate-50/60">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
