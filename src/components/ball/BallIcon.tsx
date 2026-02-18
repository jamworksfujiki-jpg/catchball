"use client";

import { cn } from "@/lib/utils";
import { BallTemperature, BALL_TEMP_CONFIG } from "@/types";
import { motion } from "framer-motion";

interface BallIconProps {
  temperature: BallTemperature;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}

const sizeMap = {
  sm: "w-8 h-8 text-lg",
  md: "w-12 h-12 text-2xl",
  lg: "w-16 h-16 text-3xl",
};

export function BallIcon({ temperature, size = "md", animate = true }: BallIconProps) {
  const config = BALL_TEMP_CONFIG[temperature];

  return (
    <motion.div
      className={cn(
        "rounded-full flex items-center justify-center",
        sizeMap[size],
        config.bg,
        temperature === "burning" && animate && "animate-shake animate-pulse-glow"
      )}
      whileHover={animate ? { scale: 1.1, rotate: 10 } : undefined}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <span>{config.emoji}</span>
    </motion.div>
  );
}
