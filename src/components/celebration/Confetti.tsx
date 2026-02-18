"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiProps {
  show: boolean;
  message?: string;
  onComplete?: () => void;
}

function ConfettiPiece({ delay, color }: { delay: number; color: string }) {
  const x = Math.random() * 400 - 200;
  const rotation = Math.random() * 720 - 360;

  return (
    <motion.div
      initial={{ y: 0, x: 0, opacity: 1, rotate: 0, scale: 1 }}
      animate={{
        y: [0, -100, 300],
        x: [0, x * 0.5, x],
        opacity: [1, 1, 0],
        rotate: [0, rotation / 2, rotation],
        scale: [1, 1.2, 0.5],
      }}
      transition={{
        duration: 2,
        delay: delay,
        ease: "easeOut",
      }}
      className="absolute w-3 h-3 rounded-sm"
      style={{ backgroundColor: color }}
    />
  );
}

const COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899"];

export function Confetti({ show, message = "ナイスキャッチ！", onComplete }: ConfettiProps) {
  const [pieces, setPieces] = useState<{ id: number; delay: number; color: string }[]>([]);

  useEffect(() => {
    if (show) {
      const newPieces = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        delay: Math.random() * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
      setPieces(newPieces);
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
        >
          <div className="relative">
            {pieces.map((piece) => (
              <ConfettiPiece key={piece.id} delay={piece.delay} color={piece.color} />
            ))}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl px-8 py-6 text-center"
            >
              <div className="text-4xl mb-2">⚾</div>
              <p className="text-xl font-bold text-gray-800">{message}</p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
