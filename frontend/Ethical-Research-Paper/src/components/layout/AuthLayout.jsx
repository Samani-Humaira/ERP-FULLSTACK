import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FloatingOrb } from '../ui/animations';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50 flex flex-col relative overflow-hidden">
      {/* Animated background orbs */}
      <FloatingOrb className="w-96 h-96 bg-primary-400 -top-20 -left-20" delay={0} />
      <FloatingOrb className="w-80 h-80 bg-violet-400 -bottom-10 -right-10" delay={2} />
      <FloatingOrb className="w-64 h-64 bg-sky-300 top-1/3 right-1/4" delay={4} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="pt-8 pb-4 text-center relative z-10"
      >
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-primary-600 to-violet-600 rounded-xl shadow-lg shadow-primary-500/25">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">
            Ethical Research Assistant
          </span>
        </Link>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 flex items-start justify-center px-4 pt-8 pb-12 relative z-10"
      >
        <div className="w-full max-w-md">{children}</div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="pb-6 text-center relative z-10"
      >
        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Ethical Research Assistant. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
