import { motion } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import { FloatingOrb } from "../ui/animations";

export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_#eef2ff_0%,_#ffffff_48%,_#f5f3ff_100%)]">
      {/* Animated background orbs */}
      <FloatingOrb
        className="w-96 h-96 bg-primary-400 -top-20 -left-20"
        delay={0}
      />
      <FloatingOrb
        className="w-80 h-80 bg-violet-400 -bottom-10 -right-10"
        delay={2}
      />
      <FloatingOrb
        className="w-64 h-64 bg-sky-300 top-1/3 right-1/4"
        delay={4}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 px-5 pb-4 pt-7 sm:px-8 sm:pt-8"
      >
        <Link
          to="/login"
          className="mx-auto inline-flex items-center gap-2.5 sm:mx-0"
        >
          <div className="p-2 bg-gradient-to-br from-primary-600 to-violet-600 rounded-xl shadow-lg shadow-primary-500/25">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            Ethical Research Assistant
          </span>
        </Link>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-1 items-center justify-center px-4 pb-10 pt-5 sm:px-8 sm:pb-12"
      >
        <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1fr_420px] lg:gap-16">
          <div className="hidden max-w-xl lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-white/70 px-3.5 py-2 text-xs font-semibold text-primary-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />A clearer path
              through the literature
            </div>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.12] tracking-tight text-slate-950">
              Good research starts with a better question.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
              Discover relevant studies, connect emerging themes, and turn your
              curiosity into a structured research direction.
            </p>
            <div className="mt-8 space-y-3">
              {[
                { icon: Search, text: "Explore academic literature" },
                { icon: BookOpen, text: "Understand themes and gaps" },
                { icon: ShieldCheck, text: "Keep your work organized" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-3 text-sm font-medium text-slate-700"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm ring-1 ring-slate-200/70">
                    <Icon className="h-4 w-4" />
                  </span>
                  {text}
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto w-full max-w-md">{children}</div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="pb-6 text-center relative z-10"
      >
        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Ethical Research Assistant. All
          rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
