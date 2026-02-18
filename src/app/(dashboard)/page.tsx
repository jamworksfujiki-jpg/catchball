"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { onProjectsChange, onMembersChange, getBalls, updateBall } from "@/lib/firestore";
import { Project, Ball, Member, getBallTemperature, BALL_TEMP_CONFIG, getLevelInfo } from "@/types";
import { BallCard } from "@/components/ball/BallCard";
import { Confetti } from "@/components/celebration/Confetti";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "おはようございます";
  if (h < 17) return "お疲れさまです";
  return "こんばんは";
}

export default function DashboardPage() {
  const { user, member, companyId } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [myBalls, setMyBalls] = useState<{ ball: Ball; projectName: string; projectId: string }[]>([]);
  const [teamBalls, setTeamBalls] = useState<Map<string, number>>(new Map());
  const [showConfetti, setShowConfetti] = useState(false);
  const [tossDialog, setTossDialog] = useState<{ ball: Ball; projectId: string } | null>(null);
  const [tossTarget, setTossTarget] = useState("");

  useEffect(() => {
    if (!companyId) return;
    const unsub1 = onProjectsChange(companyId, setProjects);
    const unsub2 = onMembersChange(companyId, setMembers);
    return () => { unsub1(); unsub2(); };
  }, [companyId]);

  useEffect(() => {
    if (!companyId || !user || projects.length === 0) return;
    let cancelled = false;

    async function loadBalls() {
      const allMyBalls: { ball: Ball; projectName: string; projectId: string }[] = [];
      const ballCounts = new Map<string, number>();

      for (const proj of projects) {
        if (proj.status === "completed" || proj.status === "cancelled") continue;
        const balls = await getBalls(companyId!, proj.id);
        for (const ball of balls) {
          if (ball.status === "completed") continue;
          const count = ballCounts.get(ball.holderId) || 0;
          ballCounts.set(ball.holderId, count + 1);
          if (ball.holderId === user!.uid) {
            allMyBalls.push({ ball, projectName: proj.name, projectId: proj.id });
          }
        }
      }

      if (!cancelled) {
        setMyBalls(allMyBalls);
        setTeamBalls(ballCounts);
      }
    }

    loadBalls();
    const interval = setInterval(loadBalls, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [companyId, user, projects]);

  const handleComplete = useCallback(async (ball: Ball, projectId: string) => {
    if (!companyId) return;
    await updateBall(companyId, projectId, ball.id, {
      status: "completed",
      completedAt: Timestamp.now(),
    });
    setShowConfetti(true);
    setMyBalls((prev) => prev.filter((b) => b.ball.id !== ball.id));
  }, [companyId]);

  const handleToss = useCallback(async () => {
    if (!companyId || !tossDialog || !tossTarget) return;
    const targetMember = members.find((m) => m.uid === tossTarget);
    await updateBall(companyId, tossDialog.projectId, tossDialog.ball.id, {
      holderId: tossTarget,
      holderName: targetMember?.displayName || "",
      thrownBy: user!.uid,
      thrownByName: member?.displayName || "",
      holdingSince: Timestamp.now(),
      status: "holding",
    });
    setTossDialog(null);
    setTossTarget("");
    setMyBalls((prev) => prev.filter((b) => b.ball.id !== tossDialog.ball.id));
  }, [companyId, tossDialog, tossTarget, members, user, member]);

  const urgentBalls = myBalls.filter((b) => {
    const since = b.ball.holdingSince?.toDate?.() || new Date();
    return getBallTemperature(since) === "burning" || getBallTemperature(since) === "hot";
  });

  const levelInfo = getLevelInfo(member?.stats?.completed || 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Confetti show={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">
          {getGreeting()}、{member?.displayName || user?.displayName}さん！ ⚾
        </h1>
        <p className="text-gray-500 mt-1">
          {levelInfo.emoji} {levelInfo.title} ・ {member?.stats?.completed || 0}個のボールをキャッチ済み
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "持ってるボール", value: myBalls.length, emoji: "🏐", color: "bg-blue-50 text-blue-600" },
          { label: "期限が近い", value: urgentBalls.length, emoji: "⏰", color: "bg-orange-50 text-orange-600" },
          { label: "連続日数", value: member?.stats?.streak || 0, emoji: "🔥", color: "bg-red-50 text-red-600" },
          { label: "今週完了", value: member?.stats?.completed || 0, emoji: "✅", color: "bg-green-50 text-green-600" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-1">{stat.emoji}</div>
                <div className={`text-2xl font-bold ${stat.color.split(" ")[1]}`}>{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* My Balls */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            🏐 あなたのボール
            {myBalls.length > 0 && (
              <Badge variant="secondary" className="ml-2">{myBalls.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {myBalls.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-4">✨</div>
              <p className="text-lg font-medium">すべてのボールを処理済み！</p>
              <p className="text-sm">素晴らしい！今日もお疲れさまです。</p>
            </div>
          ) : (
            <AnimatePresence>
              {myBalls.map(({ ball, projectName, projectId }) => (
                <BallCard
                  key={ball.id}
                  ball={ball}
                  members={members}
                  isMyBall
                  projectName={projectName}
                  onComplete={(b) => handleComplete(b, projectId)}
                  onToss={(b) => setTossDialog({ ball: b, projectId })}
                  onClick={() => router.push(`/projects/${projectId}`)}
                />
              ))}
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* Team Status */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">👥 チームのボール保持状況</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {members.map((m) => {
              const count = teamBalls.get(m.uid) || 0;
              return (
                <motion.div
                  key={m.uid}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
                      {m.displayName?.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{m.displayName}</p>
                    <p className="text-xs text-gray-400">{m.jobTitle}</p>
                  </div>
                  <div className="text-right">
                    {count === 0 ? (
                      <span className="text-green-500 text-xs">✨完了</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
                          <span key={i} className="text-sm">🏐</span>
                        ))}
                        {count > 5 && <span className="text-xs text-gray-400">+{count - 5}</span>}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Projects */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">🏗️ 進行中の案件</CardTitle>
          <Button variant="outline" size="sm" onClick={() => router.push("/projects")}>
            すべて見る
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {projects.filter((p) => p.status === "active" || p.status === "planning").slice(0, 5).map((proj) => (
              <motion.div
                key={proj.id}
                whileHover={{ x: 4 }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => router.push(`/projects/${proj.id}`)}
              >
                <div>
                  <p className="font-medium text-gray-800">{proj.name}</p>
                  <p className="text-xs text-gray-400">{proj.clientName}</p>
                </div>
                <Badge variant={proj.status === "active" ? "default" : "secondary"}>
                  {proj.status === "active" ? "施工中" : "計画中"}
                </Badge>
              </motion.div>
            ))}
            {projects.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p>まだ案件がありません</p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => router.push("/projects")}
                >
                  最初の案件を作成する
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Toss Dialog */}
      <Dialog open={!!tossDialog} onOpenChange={() => setTossDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚾ ボールを投げる</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-gray-600">
              「{tossDialog?.ball.title}」を誰に投げますか？
            </p>
            <Select value={tossTarget} onValueChange={setTossTarget}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="受け取る人を選択" />
              </SelectTrigger>
              <SelectContent>
                {members
                  .filter((m) => m.uid !== user?.uid)
                  .map((m) => (
                    <SelectItem key={m.uid} value={m.uid}>
                      {m.displayName}（{m.jobTitle}）
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full h-12 bg-blue-500 hover:bg-blue-600"
              disabled={!tossTarget}
              onClick={handleToss}
            >
              投げる ⚾
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
