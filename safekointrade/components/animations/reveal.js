"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Restrained in-view reveal: a short fade with 12px of travel, once.
 * Use on section headings and grouped content, not on every card.
 */
export function Reveal({ children, delay = 0, className, as = "div" }) {
  const reduce = useReducedMotion();
  const Comp = motion[as] ?? motion.div;
  if (reduce) return <Comp className={className}>{children}</Comp>;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.5, delay, ease: [0.25, 1, 0.5, 1] }}
    >
      {children}
    </Comp>
  );
}

/** Staggers direct children that are <RevealItem>. */
export function RevealGroup({ children, className, stagger = 0.06, as = "div" }) {
  const reduce = useReducedMotion();
  const Comp = motion[as] ?? motion.div;
  return (
    <Comp
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </Comp>
  );
}

export function RevealItem({ children, className, as = "div", ...rest }) {
  const Comp = motion[as] ?? motion.div;
  return (
    <Comp
      {...rest}
      className={className}
      variants={{
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 1, 0.5, 1] } },
      }}
    >
      {children}
    </Comp>
  );
}
