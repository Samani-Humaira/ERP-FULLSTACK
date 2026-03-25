import { motion } from 'framer-motion';

const variants = {
  primary: 'bg-primary-100/80 text-primary-800 ring-1 ring-primary-200/50',
  success: 'bg-emerald-100/80 text-emerald-800 ring-1 ring-emerald-200/50',
  warning: 'bg-amber-100/80 text-amber-800 ring-1 ring-amber-200/50',
  danger: 'bg-red-100/80 text-red-800 ring-1 ring-red-200/50',
  neutral: 'bg-slate-100/80 text-slate-700 ring-1 ring-slate-200/50',
};

export default function Badge({ children, variant = 'primary', className = '' }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </motion.span>
  );
}
