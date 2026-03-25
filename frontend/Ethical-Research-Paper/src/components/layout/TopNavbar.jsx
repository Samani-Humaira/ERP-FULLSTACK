import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, ChevronDown, UserCircle, Settings, LogOut } from 'lucide-react';

export default function TopNavbar({ onMenuClick }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Get user from localStorage saved during login
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const fullName = user?.full_name || 'Researcher';
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setDropdownOpen(false);
    navigate('/login');
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
                <p className="text-sm font-medium text-slate-800 truncate">{fullName}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email || ''}</p>
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