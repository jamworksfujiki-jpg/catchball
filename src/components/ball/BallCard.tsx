"use client";

import { Ball, getBallTemperature, BALL_TEMP_CONFIG, BALL_STATUS_LABELS, Member } from "@/types";
import { BallIcon } from "./BallIcon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowRight, Check, Clock, AlertTriangle } from "lucide-react";
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        temperature === "burning" && "animate-shake"
      )}
    >
      <Card
        className={cn(
          "cursor-pointer border-l-4 transition-all hover:shadow-md",
          temperature === "cool" && "border-l-blue-400",
          temperature === "warm" && "border-l-yellow-400",
          temperature === "hot" && "border-l-orange-400",
          temperature === "burning" && "border-l-red-500",
          ball.status === "completed" && "border-l-green-400 opacity-70",
          ball.isInterruption && "border-dashed"
        )}
        onClick={() => onClick?.(ball)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <BallIcon temperature={ball.status === "completed" ? "cool" : temperature} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {projectName && (
                  <span className="text-xs text-gray-400">{projectName}</span>
                )}
                {ball.isInterruption && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-500 border-orange-300">
                    割り込み
                  </Badge>
                )}
                {ball.priority === "urgent" && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    急ぎ
                  </Badge>
                )}
              </div>
              <h4 className="font-medium text-gray-800 truncate">{ball.title}</h4>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <Avatar className="w-5 h-5">
                  <AvatarFallback className="text-[10px] bg-gray-100">
                    {holder?.displayName?.slice(0, 1) || "?"}
                  </AvatarFallback>
                </Avatar>
                <span>{holder?.displayName || "未割当"}</span>
                {ball.status !== "completed" && (
                  <>
                    <Clock className="w-3 h-3 ml-2" />
                    <span className={cn(config.color, "text-xs")}>{holdingTime}</span>
                  </>
                )}
              </div>
            </div>
            {isMyBall && ball.status !== "completed" && (
              <div className="flex gap-1 shrink-0">
                {onToss && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); onToss(ball); }}
                    className="text-xs h-8"
                  >
                    <ArrowRight className="w-3 h-3 mr-1" />
                    投げる
                  </Button>
                )}
                {onComplete && (
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onComplete(ball); }}
                    className="text-xs h-8 bg-green-500 hover:bg-green-600"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    完了
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
