import { motion } from 'framer-motion';
import { Sparkles, Car } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '../constants/index.js';

export default function Header() {
  return (
    <header className="mx-auto w-full max-w-6xl px-4 pt-10 text-center">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-brand-400"
      >
        <Sparkles className="h-4 w-4" />
        Powered by gpt-image-1
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="mt-5 flex items-center justify-center gap-3 text-4xl font-extrabold tracking-tight sm:text-5xl"
      >
        <Car className="h-9 w-9 text-brand-500" />
        <span className="bg-gradient-to-r from-white via-brand-400 to-brand-600 bg-clip-text text-transparent">
          {APP_NAME}
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mx-auto mt-3 max-w-2xl text-balance text-base text-slate-400 sm:text-lg"
      >
        {APP_TAGLINE} Upload a car photo from any location, pick a background, and get a
        polished, advertising-ready image — backgrounds removed, lighting fixed and realistic
        shadows generated automatically.
      </motion.p>
    </header>
  );
}
