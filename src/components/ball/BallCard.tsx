"use client";

import { Ball, getBallTemperature, BALL_TEMP_CONFIG, Member } from "@/types";
import { BallIcon } from "./BallIcon";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowRight, Check, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

interface BallCardProps {
  ball: Ball;
  members: Member[];
  isMyBall?: boolean;
  projectName?: string;
  onToss?: (ball: Ball) => void;
  onComplete?: (ball: Ball) => void;
  onClick?: (ball: Ball) => void;
}

export function BallCard({
  ball,
  members,
  isMyBall,
  projectName,
  onToss,
  onComplete,
  onClick,
}: BallCardProps) {
  const holdingSince = ball.holdingSince?.toDate?.() || new Date(ball.holdingSince as any);
  const temperature = getBallTemperature(holdingSince);
  const config = BALL_TEMP_CONFIG[temperature];
  const holder = members.find((m) => m.uid === ball.holderId);
  const holdingTime = formatDistanceToNow(holdingSince, { locale: ja, addSuffix: false });

  const isCompleted = ball.status === "completed";
  const isBurning = temperature === "burning";
  const isHot = temperature === "hot";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(isBurning && !isCompleted && "animate-shake")}
    >
      <div
        className={cn(
          "bg-white rounded-xl border p-3.5 cursor-pointer transition-all hover:shadow-sm",
          isCompleted
            ? "border-gray-200 bg-gray-50"
            : isBurning
            ? "border-red-200 border-l-4 border-l-red-500"
            : isHot
            ? "border-orange-200 border-l-4 border-l-orange-400"
            : "border-gray-200 hover:border-teal-200",
          ball.isInterruption && "border-dashed"
        )}
        onClick={() => onClick?.(ball)}
      >
        <div className="flex items-start gap-3">
          <BallIcon temperature={isCompleted ? "cool" : temperature} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {projectName && (
                <span className="text-[11px] bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded-md font-medium">
                  {projectName}
                </span>
              )}
              {ball.isInterruption && (
                <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md font-bold">
                  割り込み
                </span>
              )}
              {ball.priority === "urgent" && (
                <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-md font-bold">
                  急ぎ
                </span>
              )}
            </div>
            <h4 className={cn("font-bold text-sm", isCompleted ? "text-gray-400 line-through" : "text-[#1B1B27]")}>
              {ball.title}
            </h4>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
              <Avatar className="w-5 h-5">
                <AvatarFallback className="text-[9px] bg-teal-50 font-bold text-teal-600">
                  {holder?.displayName?.slice(0, 1) || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-gray-500">{holder?.displayName || "未割当"}</span>
              {!isCompleted && (
                <span className={cn(
                  "flex items-center gap-1",
                  isBurning ? "text-red-500 font-bold" : isHot ? "text-orange-500 font-bold" : "text-gray-400"
                )}>
                  <Clock className="w-3 h-3" />
                  {holdingTime}
                </span>
              )}
              {isCompleted && (
                <span className="text-emerald-500 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> 完了
                </span>
              )}
            </div>
          </div>
          {isMyBall && !isCompleted && (
            <div className="flex gap-1.5 shrink-0">
              {onToss && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); onToss(ball); }}
                  className="text-xs h-8 rounded-lg border-teal-200 text-teal-600 hover:bg-teal-50"
                >
                  <ArrowRight className="w-3 h-3 mr-1" />
                  投げる
                </Button>
              )}
              {onComplete && (
                <Button
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onComplete(ball); }}
                  className="text-xs h-8 rounded-lg bg-teal-500 hover:bg-teal-600 text-white"
                >
                  <Check className="w-3 h-3 mr-1" />
                  完了
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
