"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Trophy, Star, Target, Gift } from "lucide-react";

interface Mission {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  reward: string;
  completed: boolean;
}

interface MissionPanelProps {
  myBallCount: number;
  completedToday: number;
  tosses: number;
  totalCompleted: number;
  streak: number;
  level: number;
}

export function MissionPanel({ myBallCount, completedToday, tosses, totalCompleted, streak, level }: MissionPanelProps) {
  const [tab, setTab] = useState<"daily" | "weekly" | "total">("daily");

  const dailyMissions: Mission[] = [
    { id: "d1", title: "ボールを1つ完了する", description: "今日のノルマをクリア！", current: Math.min(completedToday, 1), target: 1, reward: "+10 EXP", completed: completedToday >= 1 },
    { id: "d2", title: "ボールを3つ完了する", description: "絶好調！", current: Math.min(completedToday, 3), target: 3, reward: "+30 EXP", completed: completedToday >= 3 },
    { id: "d3", title: "チームメイトにボールを投げる", description: "チームワーク発揮！", current: Math.min(tosses, 1), target: 1, reward: "+15 EXP", completed: tosses >= 1 },
  ];

  const weeklyMissions: Mission[] = [
    { id: "w1", title: "10個のボールを完了", description: "今週の目標", current: Math.min(totalCompleted, 10), target: 10, reward: "+100 EXP", completed: totalCompleted >= 10 },
    { id: "w2", title: "5日連続ログイン", description: "コツコツが大事", current: Math.min(streak, 5), target: 5, reward: "+50 EXP", completed: streak >= 5 },
  ];

  const totalMissions: Mission[] = [
    { id: "t1", title: "累計50個のボール完了", description: "見習い卒業！", current: Math.min(totalCompleted, 50), target: 50, reward: "称号「一人前」", completed: totalCompleted >= 50 },
    { id: "t2", title: "累計100個のボール完了", description: "腕が上がってきた！", current: Math.min(totalCompleted, 100), target: 100, reward: "称号「棟梁」", completed: totalCompleted >= 100 },
    { id: "t3", title: "累計500個のボール完了", description: "伝説の領域へ", current: Math.min(totalCompleted, 500), target: 500, reward: "称号「匠」", completed: totalCompleted >= 500 },
    { id: "t4", title: "30日連続ログイン", description: "鉄人への道", current: Math.min(streak, 30), target: 30, reward: "+500 EXP", completed: streak >= 30 },
  ];

  const tabs = [
    { id: "daily" as const, label: "デイリー", icon: Target },
    { id: "weekly" as const, label: "ウィークリー", icon: Star },
    { id: "total" as const, label: "通算", icon: Trophy },
  ];

  const currentMissions = tab === "daily" ? dailyMissions : tab === "weekly" ? weeklyMissions : totalMissions;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-300" />
        <h3 className="text-white font-bold">ミッション</h3>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-all border-b-2",
                tab === t.id
                  ? "text-blue-600 border-blue-500 bg-blue-50/50"
                  : "text-gray-400 border-transparent hover:text-gray-600"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Missions */}
      <div className="p-3 space-y-2">
        {currentMissions.map((mission, i) => (
          <motion.div
            key={mission.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "rounded-xl p-3 border transition-all",
              mission.completed
                ? "bg-amber-50 border-amber-200"
                : "bg-white border-gray-100 hover:border-blue-200 hover:shadow-sm"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0 font-bold",
                mission.completed
                  ? "bg-amber-100 text-amber-600"
                  : "bg-blue-50 text-blue-500"
              )}>
                {mission.completed ? "★" : "○"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={cn(
                    "font-medium text-sm",
                    mission.completed ? "text-amber-700" : "text-gray-800"
                  )}>
                    {mission.title}
                  </p>
                  {mission.completed ? (
                    <span className="text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-bold">達成！</span>
                  ) : (
                    <span className="text-xs text-blue-500 font-medium flex items-center gap-0.5">
                      <Gift className="w-3 h-3" />
                      {mission.reward}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{mission.description}</p>
                {!mission.completed && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">進捗</span>
                      <span className="text-xs font-bold text-blue-600">
                        {mission.current}/{mission.target}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((mission.current / mission.target) * 100, 100)}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
