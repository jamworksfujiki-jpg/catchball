"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    emoji: "⚾",
    title: "キャッチボールへようこそ！",
    description: "建築業の進捗管理を、もっとカンタンに。\nボールを投げて、受け取って、仕事を前に進めよう！",
    bg: "from-blue-500 to-blue-600",
  },
  {
    emoji: "🏐",
    title: "ボール = やるべきこと",
    description: "タスクの代わりに「ボール」を使います。\n誰がボールを持っているかが一目でわかる！\n\n🔵 余裕あり → 🟡 そろそろ → 🟠 急いで → 🔴 炎上中！",
    bg: "from-blue-600 to-blue-700",
  },
  {
    emoji: "🏗️",
    title: "工程にそって進めよう",
    description: "新築20工程、リフォーム12工程など\n建築に特化したパイプラインが使えます。\n\n案件ごとにボールを管理して、\n進捗を見える化しましょう！",
    bg: "from-blue-500 to-blue-600",
  },
  {
    emoji: "🏆",
    title: "ミッションをクリアしよう！",
    description: "ボールを完了するとポイントGET！\nデイリーミッションをこなしてランクアップ！\n\n🌱見習い → ⭐一人前 → 🏗️棟梁 → 👑親方 → 🏆匠",
    bg: "from-blue-600 to-blue-700",
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ type: "spring", damping: 20 }}
          className={`bg-gradient-to-br ${current.bg} rounded-3xl p-8 max-w-md mx-4 text-white shadow-2xl`}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2, stiffness: 200 }}
            className="text-7xl text-center mb-6"
          >
            {current.emoji}
          </motion.div>

          <h2 className="text-2xl font-bold text-center mb-4">{current.title}</h2>
          <p className="text-center text-white/90 leading-relaxed whitespace-pre-line mb-8">
            {current.description}
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2.5 rounded-full transition-all ${
                  i === step ? "bg-amber-300 w-8" : i < step ? "bg-white/70 w-2.5" : "bg-white/30 w-2.5"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <Button
                variant="ghost"
                className="flex-1 h-12 text-white hover:bg-white/20 border border-white/30"
                onClick={() => setStep(step - 1)}
              >
                戻る
              </Button>
            )}
            <Button
              className="flex-1 h-12 bg-white text-blue-600 hover:bg-white/90 font-bold text-base"
              onClick={() => {
                if (isLast) onComplete();
                else setStep(step + 1);
              }}
            >
              {isLast ? "さあ、始めよう！ ⚾" : "次へ"}
            </Button>
          </div>

          {!isLast && (
            <button
              onClick={onComplete}
              className="w-full mt-3 text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              スキップ
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
