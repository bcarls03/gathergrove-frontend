// src/components/AnimatedCard.tsx
import type React from "react";
import { motion } from "framer-motion";

type Props = React.HTMLAttributes<HTMLDivElement>;

export const AnimatedCard: React.FC<Props> = ({ children, ...rest }) => {
  return (
    <motion.div
      {...rest}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      whileTap={{ scale: 0.97 }}
    >
      {children}
    </motion.div>
  );
};
