import { motion } from 'framer-motion';

export default function LoadingSpinner({ text = 'Loading...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="relative mb-4">
        {/* Outer ring */}
        <motion.div
          className="h-12 w-12 rounded-full border-2 border-primary-200"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        {/* Inner spinning arc */}
        <motion.div
          className="absolute inset-0 h-12 w-12 rounded-full border-2 border-transparent border-t-primary-600 border-r-primary-600"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        {/* Pulsing center dot */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="h-2 w-2 rounded-full bg-primary-500" />
        </motion.div>
      </div>
      <motion.p
        className="text-sm text-slate-500"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {text}
      </motion.p>
    </div>
  );
}
