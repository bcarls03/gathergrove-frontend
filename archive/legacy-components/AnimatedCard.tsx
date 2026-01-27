// src/components/AnimatedCard.tsx
import { motion, type HTMLMotionProps } from "framer-motion";

type Props = HTMLMotionProps<"div">;

export default function AnimatedCard({ children, ...rest }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      whileTap={{ scale: 0.99 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
