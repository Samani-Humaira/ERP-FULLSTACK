import { motion } from 'framer-motion';

export default function Card({ children, className = '', hover = false, ...props }) {
  const Component = hover ? motion.div : 'div';
  const motionProps = hover
    ? {
        whileHover: { y: -4, boxShadow: '0 12px 24px -8px rgba(0, 0, 0, 0.1)' },
        transition: { type: 'spring', stiffness: 400, damping: 25 },
      }
    : {};

  return (
    <Component
      className={`
        bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-sm
        ${hover ? 'cursor-pointer' : ''}
        ${className}
      `}
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-b border-slate-100 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-t border-slate-100 ${className}`}>
      {children}
    </div>
  );
}
