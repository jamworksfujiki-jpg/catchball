"use client";
import { motion } from "framer-motion";
import { LEVELS, getLevelInfo } from "@/types";

interface LevelBadgeProps {
  points: number;
  compact?: boolean;
}

export function LevelBadge({ points, compact = false }: LevelBadgeProps) {
  const current = getLevelInfo(points);
  const currentIdx = LEVELS.findIndex((l) => l.level === current.level);
  const next = currentIdx < LEVELS.length - 1 ? LEVELS[currentIdx + 1] : null;
  const progress = next
    ? ((points - current.minPoints) / (next.minPoints - current.minPoints)) * 100
    : 100;

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl px-3 py-2.5 shadow-sm">
        <span className="text-xl">{current.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">Lv.{current.level} {current.title}</span>
            <span className="text-xs text-blue-200">{points} pt</span>
          </div>
          <div className="h-1.5 bg-blue-400/40 rounded-full mt-1 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-amber-300 rounded-full"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-5">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl shadow-lg"
          >
            {current.emoji}
          </motion.div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">Lv.{current.level}</span>
              <span className="text-lg font-bold text-amber-300">{current.title}</span>
            </div>
            <p className="text-sm text-blue-200 mt-0.5">{points} ポイント</p>
          </div>
        </div>
        {next && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-blue-200">次のレベルまで</span>
              <span className="text-xs font-bold text-amber-300">
                あと {next.minPoints - points} pt
              </span>
            </div>
            <div className="h-3 bg-blue-400/40 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-amber-300 to-amber-400 rounded-full relative"
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow" />
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
