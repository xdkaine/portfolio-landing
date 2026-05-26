"use client";

import { motion, useReducedMotion } from "motion/react";
import { useJourneyTransitionActive } from "@/components/JourneyTransition";

export default function Template({ children }: { children: React.ReactNode }) {
  const journeyActive = useJourneyTransitionActive();
  const shouldReduceMotion = useReducedMotion();
  const suppressEntrance = journeyActive || Boolean(shouldReduceMotion);

  return (
    <motion.div
      initial={suppressEntrance ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: suppressEntrance ? 0 : 0.3,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
