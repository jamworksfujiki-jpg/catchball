"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getProjects, getBalls, updateBall } from "@/lib/firestore";
import { Project, Ball, getBallTemperature, BALL_TEMP_CONFIG, BALL_STATUS_LABELS } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, ThumbsUp, Clock, Inbox } from "lucide-react";
import { toast } from "sonner";

interface BallWithProject extends Ball {
  projectName: string;
  projectId: string;
}

export default function ContractorPage() {
  const { user, companyId, member } = useAuth();
  const [balls, setBalls] = useState<BallWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !user) return;
    loadBalls();
  }, [companyId, user]);

  async function loadBalls() {
    if (!companyId || !user) return;
    setLoading(true);
    try {
      const projects = await getProjects(companyId);
      const allBalls: BallWithProject[] = [];

      for (const project of projects) {
        const projectBalls = await getBalls(companyId, project.id);
        const myBalls = projectBalls
          .filter((b) => b.holderId === user.uid && b.status !== "completed")
          .map((b) => ({
            ...b,
            projectName: project.name,
            projectId: project.id,
          }));
        allBalls.push(...myBalls);
      }

      // Sort by priority (urgent first) then by holdingSince (oldest first)
      allBalls.sort((a, b) => {
        if (a.priority === "urgent" && b.priority !== "urgent") return -1;
        if (a.priority !== "urgent" && b.priority === "urgent") return 1;
        const aTime = a.holdingSince?.toDate?.()?.getTime() || 0;
        const bTime = b.holdingSince?.toDate?.()?.getTime() || 0;
        return aTime - bTime;
      });

      setBalls(allBalls);
    } catch (err) {
      console.error("Failed to load balls:", err);
      toast.error("データの読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(ball: BallWithProject, newStatus: "approved" | "rejected" | "completed") {
    if (!companyId) return;
    setActionLoading(ball.id);
    try {
      const updateData: Partial<Ball> = { status: newStatus };
      if (newStatus === "completed") {
        updateData.completedAt = new (await import("firebase/firestore")).Timestamp(
          Math.floor(Date.now() / 1000), 0
        );
      }
      await updateBall(companyId, ball.projectId, ball.id, updateData);
      setBalls((prev) => prev.filter((b) => b.id !== ball.id || newStatus !== "completed"));

      const labels: Record<string, string> = {
        approved: "承認しました",
        rejected: "差し戻しました",
        completed: "完了しました",
      };
      toast.success(`「${ball.title}」を${labels[newStatus]}`);
      await loadBalls();
    } catch (err) {
      toast.error("操作に失敗しました。");
    } finally {
      setActionLoading(null);
    }
  }

  function getHoldingTime(holdingSince: any): string {
    if (!holdingSince?.toDate) return "";
    const diff = Date.now() - holdingSince.toDate().getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}日${hours % 24}時間`;
    if (hours > 0) return `${hours}時間`;
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}分`;
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent mx-auto"
        />
        <p className="text-gray-400 mt-4">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">📥 あなたへの依頼</h1>
        <p className="text-gray-500 text-sm mt-1">
          {member?.displayName || ""}さんに割り当てられたタスク
        </p>
      </div>

      {balls.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <Inbox className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500">依頼はありません</h3>
            <p className="text-sm text-gray-400 mt-1">新しい依頼が届くとここに表示されます</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {balls.map((ball, i) => {
            const temp = ball.holdingSince?.toDate
              ? getBallTemperature(ball.holdingSince.toDate())
              : "cool";
            const tempConfig = BALL_TEMP_CONFIG[temp];
            const holdingTime = getHoldingTime(ball.holdingSince);
            const isProcessing = actionLoading === ball.id;

            return (
              <motion.div
                key={ball.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-1">{ball.projectName}</p>
                        <h3 className="font-medium text-gray-800">{ball.title}</h3>
                        {ball.description && (
                          <p className="text-sm text-gray-500 mt-1">{ball.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {ball.priority === "urgent" && (
                          <Badge className="bg-red-100 text-red-700">緊急</Badge>
                        )}
                        <Badge className={tempConfig.bg + " " + tempConfig.color}>
                          {tempConfig.emoji} {tempConfig.label}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center text-xs text-gray-400 gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        保持: {holdingTime}
                      </span>
                      <span>状態: {BALL_STATUS_LABELS[ball.status]}</span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                        disabled={isProcessing}
                        onClick={() => handleAction(ball, "approved")}
                      >
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        承認
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                        disabled={isProcessing}
                        onClick={() => handleAction(ball, "rejected")}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        却下
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-teal-500 hover:bg-teal-600 text-white"
                        disabled={isProcessing}
                        onClick={() => handleAction(ball, "completed")}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        完了
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="text-center text-xs text-gray-300 py-4">
        ⚾ キャッチボール
      </div>
    </div>
  );
}
