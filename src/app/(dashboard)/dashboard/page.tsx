"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { onProjectsChange, onMembersChange, getBalls, updateBall } from "@/lib/firestore";
import { Project, Ball, Member, getBallTemperature } from "@/types";
import { BallCard } from "@/components/ball/BallCard";
import { Confetti } from "@/components/celebration/Confetti";
import { SetupWizard } from "@/components/onboarding/SetupWizard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import { ChevronRight, ChevronDown, Users, FolderOpen, Send, ArrowRight, Zap } from "lucide-react";

// ============ Fun Action Messages ============
const COMPLETE_MESSAGES = [
  "ナイスバッティング！ ⚾",
  "ファインプレー！ 🌟",
  "ナイスキャッチ！ 🧤",
  "お見事！ 👏",
  "グッジョブ！ 💪",
  "サクサク処理！ ✨",
];

const COMPLETE_URGENT_MESSAGES = [
  "ホームラン！ 🏟️",
  "逆転サヨナラ！ 🎉",
  "三振奪取！ 🔥",
  "ファインセーブ！ 🛡️",
];

const TOSS_MESSAGES = [
  "ナイスパス！ ⚾",
  "送球OK！ 👍",
  "いい球投げた！ 🎯",
  "キャッチよろしく！ ✋",
];

function randomMessage(messages: string[]) {
  return messages[Math.floor(Math.random() * messages.length)];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "おはようございます";
  if (h < 17) return "お疲れさまです";
  return "こんばんは";
}

type BallEntry = { ball: Ball; projectName: string; projectId: string };

// CUE!-inspired section header
function SectionHeader({ children, gradient, count, rightContent }: {
  children: React.ReactNode;
  gradient: string;
  count?: number;
  rightContent?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className={cn("px-4 py-1.5 rounded-lg text-white text-sm font-bold", gradient)}>
        {children}
      </div>
      {count !== undefined && count > 0 && (
        <div className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
          {count}
        </div>
      )}
      {rightContent && <div className="ml-auto">{rightContent}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { user, member, company, companyId } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [myBalls, setMyBalls] = useState<BallEntry[]>([]);
  const [thrownBalls, setThrownBalls] = useState<BallEntry[]>([]);
  const [teamBallDetails, setTeamBallDetails] = useState<Map<string, BallEntry[]>>(new Map());
  const [showConfetti, setShowConfetti] = useState(false);
  const [tossDialog, setTossDialog] = useState<{ ball: Ball; projectId: string } | null>(null);
  const [tossTarget, setTossTarget] = useState("");
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    const unsub1 = onProjectsChange(companyId, setProjects);
    const unsub2 = onMembersChange(companyId, setMembers);
    return () => { unsub1(); unsub2(); };
  }, [companyId]);

  // Show setup wizard for new users (only owner, first time)
  useEffect(() => {
    const wizardDone = localStorage.getItem("catchball_setup_done");
    if (!wizardDone && member?.role === "owner" && members.length <= 1 && companyId) {
      setShowSetupWizard(true);
    }
  }, [member, members, companyId]);

  useEffect(() => {
    if (!companyId || !user || projects.length === 0) return;
    let cancelled = false;

    async function loadBalls() {
      const allMyBalls: BallEntry[] = [];
      const allThrownBalls: BallEntry[] = [];
      const ballsByMember = new Map<string, BallEntry[]>();

      for (const proj of projects) {
        if (proj.status === "completed" || proj.status === "cancelled") continue;
        const balls = await getBalls(companyId!, proj.id);
        for (const ball of balls) {
          if (ball.status === "completed") continue;
          const entry: BallEntry = { ball, projectName: proj.name, projectId: proj.id };
          const existing = ballsByMember.get(ball.holderId) || [];
          existing.push(entry);
          ballsByMember.set(ball.holderId, existing);
          if (ball.holderId === user!.uid) {
            allMyBalls.push(entry);
          }
          // Balls I threw to someone else (they're holding it)
          if (ball.thrownBy === user!.uid && ball.holderId !== user!.uid) {
            allThrownBalls.push(entry);
          }
        }
      }

      if (!cancelled) {
        setMyBalls(allMyBalls);
        setThrownBalls(allThrownBalls);
        setTeamBallDetails(ballsByMember);
      }
    }

    loadBalls();
    const interval = setInterval(loadBalls, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [companyId, user, projects]);

  const handleSeed = async () => {
    if (!companyId || !user || seeding) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          userId: user.uid,
          userName: member?.displayName || user.displayName || "オーナー",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`デモデータ投入完了！（${data.created.members}名, ${data.created.projects}案件, ${data.created.balls}ボール）`);
      } else {
        toast.error(data.error || "投入に失敗しました");
      }
    } catch {
      toast.error("デモデータの投入に失敗しました");
    } finally {
      setSeeding(false);
    }
  };

  const handleComplete = useCallback(async (ball: Ball, projectId: string) => {
    if (!companyId) return;
    await updateBall(companyId, projectId, ball.id, {
      status: "completed",
      completedAt: Timestamp.now(),
    });
    setShowConfetti(true);
    setMyBalls((prev) => prev.filter((b) => b.ball.id !== ball.id));

    // Fun action message
    const since = ball.holdingSince?.toDate?.() || new Date();
    const temp = getBallTemperature(since);
    const isUrgent = temp === "burning" || temp === "hot" || ball.priority === "urgent";
    toast.success(randomMessage(isUrgent ? COMPLETE_URGENT_MESSAGES : COMPLETE_MESSAGES));
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
    toast.success(randomMessage(TOSS_MESSAGES));
  }, [companyId, tossDialog, tossTarget, members, user, member]);

  const urgentBalls = myBalls.filter((b) => {
    const since = b.ball.holdingSince?.toDate?.() || new Date();
    return getBallTemperature(since) === "burning" || getBallTemperature(since) === "hot";
  });

  const totalCompleted = member?.stats?.completed || 0;
  const streak = member?.stats?.streak || 0;
  const isEmpty = projects.length === 0 && myBalls.length === 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Confetti show={showConfetti} onComplete={() => setShowConfetti(false)} />

      <AnimatePresence>
        {showSetupWizard && companyId && (
          <SetupWizard
            companyId={companyId}
            companyName={company?.name || ""}
            inviterName={member?.displayName || user?.displayName || ""}
            onComplete={() => {
              setShowSetupWizard(false);
              localStorage.setItem("catchball_setup_done", "1");
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-[#1B1B27]">
          {getGreeting()}、{member?.displayName || user?.displayName}さん
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          今日もキャッチボールでプロジェクトを前に進めよう
        </p>
      </motion.div>

      {/* Empty state - compact banner */}
      {isEmpty && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl px-5 py-4 border border-teal-200 flex items-center gap-4"
        >
          <span className="text-3xl">⚾</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#1B1B27] text-sm">さあ、キャッチボールを始めよう！</p>
            <p className="text-xs text-gray-400 mt-0.5">案件を作成してチームでタスクを回しましょう</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              className="bg-teal-500 hover:bg-teal-600 text-white h-9 rounded-lg"
              onClick={() => router.push("/projects")}
            >
              <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
              案件作成
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-teal-300 text-teal-600 hover:bg-teal-50 rounded-lg"
              onClick={() => router.push("/team")}
            >
              <Users className="w-3.5 h-3.5 mr-1.5" />
              招待
            </Button>
            <Button
              size="sm"
              className="h-9 bg-amber-500 hover:bg-amber-600 text-white rounded-lg"
              onClick={handleSeed}
              disabled={seeding}
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              {seeding ? "投入中..." : "デモデータ"}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Stats - CUE! style cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "保持中", value: myBalls.length, icon: "⚾", bg: "bg-gradient-to-br from-teal-500 to-cyan-500", textColor: "text-white" },
          { label: "要対応", value: urgentBalls.length, icon: "🔥", bg: "bg-gradient-to-br from-orange-400 to-red-400", textColor: "text-white" },
          { label: "連続日数", value: streak, icon: "⚡", bg: "bg-gradient-to-br from-amber-400 to-yellow-400", textColor: "text-white" },
          { label: "累計完了", value: totalCompleted, icon: "✅", bg: "bg-gradient-to-br from-emerald-400 to-green-500", textColor: "text-white" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={cn("rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow", stat.bg)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-lg">
                {stat.icon}
              </div>
              <div>
                <p className={cn("text-2xl font-bold", stat.textColor)}>{stat.value}</p>
                <p className="text-xs text-white/70">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* My Balls - Holding */}
      <section>
        <SectionHeader gradient="bg-gradient-to-r from-teal-500 to-cyan-500" count={myBalls.length}>
          あなたのボール
        </SectionHeader>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 space-y-2">
            {myBalls.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">✨</div>
                <p className="text-sm font-bold text-[#3C3939]">オールクリア！</p>
                <p className="text-xs text-gray-400 mt-1">保持中のボールはありません</p>
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
          </div>
        </div>
      </section>

      {/* Thrown Balls - Balls I threw to others */}
      {thrownBalls.length > 0 && (
        <section>
          <SectionHeader gradient="bg-gradient-to-r from-indigo-400 to-purple-400" count={thrownBalls.length}>
            <span className="flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              投げたボール
            </span>
          </SectionHeader>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 space-y-2">
              <AnimatePresence>
                {thrownBalls.map(({ ball, projectName, projectId }) => (
                  <BallCard
                    key={ball.id}
                    ball={ball}
                    members={members}
                    projectName={projectName}
                    onClick={() => router.push(`/projects/${projectId}`)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>
      )}

      {/* Active Projects */}
      <section>
        <SectionHeader
          gradient="bg-gradient-to-r from-emerald-500 to-green-500"
          rightContent={
            <button
              className="text-xs text-gray-400 hover:text-teal-600 flex items-center gap-0.5 transition-colors"
              onClick={() => router.push("/projects")}
            >
              すべて見る <ChevronRight className="w-3 h-3" />
            </button>
          }
        >
          進行中の案件
        </SectionHeader>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {projects.filter((p) => p.status === "active" || p.status === "planning").slice(0, 5).map((proj, i) => (
            <motion.div
              key={proj.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
              onClick={() => router.push(`/projects/${proj.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-lg">
                  {proj.type === "new_build" ? "🏠" : proj.type === "renovation" ? "🔨" : proj.type === "painting" ? "🎨" : "🏗️"}
                </div>
                <div>
                  <p className="font-medium text-[#3C3939] text-sm">{proj.name}</p>
                  <p className="text-xs text-gray-400">{proj.clientName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn(
                  "text-xs border-0",
                  proj.status === "active"
                    ? "bg-teal-100 text-teal-700"
                    : "bg-gray-100 text-gray-600"
                )}>
                  {proj.status === "active" ? "施工中" : "計画中"}
                </Badge>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </motion.div>
          ))}
          {projects.length === 0 && !isEmpty && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">まだ案件がありません</p>
              <Button className="mt-3 bg-teal-500 hover:bg-teal-600 text-white" size="sm" onClick={() => router.push("/projects")}>
                最初の案件を作成する
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Team Ball Status - Clickable to expand */}
      {members.length > 1 && (
        <section>
          <SectionHeader gradient="bg-gradient-to-r from-violet-500 to-purple-500">
            チームのボール保持状況
          </SectionHeader>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {members.map((m, i) => {
                const memberBalls = teamBallDetails.get(m.uid) || [];
                const count = memberBalls.length;
                const maxBalls = Math.max(...Array.from(teamBallDetails.values()).map((b) => b.length), 1);
                const isExpanded = expandedMember === m.uid;
                const isMe = m.uid === user?.uid;

                return (
                  <div key={m.uid}>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn(
                        "flex items-center gap-3 p-4 cursor-pointer transition-colors",
                        isExpanded ? "bg-gray-50" : "hover:bg-gray-50/50"
                      )}
                      onClick={() => setExpandedMember(isExpanded ? null : m.uid)}
                    >
                      <Avatar className="w-9 h-9">
                        <AvatarFallback
                          className={cn(
                            "text-xs font-bold",
                            isMe ? "bg-teal-100 text-teal-600" : "bg-gray-100 text-gray-500"
                          )}
                        >
                          {m.displayName?.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-[#3C3939] truncate">{m.displayName}</p>
                            {isMe && (
                              <span className="text-[10px] bg-teal-50 text-teal-500 px-1.5 py-0.5 rounded font-medium">
                                自分
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-xs font-bold",
                                count === 0
                                  ? "text-gray-300"
                                  : count <= 3
                                  ? "text-teal-500"
                                  : count <= 6
                                  ? "text-amber-500"
                                  : "text-orange-500"
                              )}
                            >
                              {count}個
                            </span>
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 text-gray-300 transition-transform duration-200",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${maxBalls > 0 ? (count / maxBalls) * 100 : 0}%` }}
                            transition={{ duration: 0.8 }}
                            className={cn(
                              "h-full rounded-full",
                              count === 0
                                ? "bg-gray-200"
                                : count <= 3
                                ? "bg-gradient-to-r from-teal-400 to-cyan-400"
                                : count <= 6
                                ? "bg-gradient-to-r from-amber-400 to-yellow-400"
                                : "bg-gradient-to-r from-orange-400 to-red-400"
                            )}
                          />
                        </div>
                      </div>
                    </motion.div>

                    <AnimatePresence>
                      {isExpanded && memberBalls.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-gray-50/50 px-4 pb-4 pt-1 space-y-2 border-t border-gray-100">
                            {memberBalls.map(({ ball, projectName, projectId }) => (
                              <BallCard
                                key={ball.id}
                                ball={ball}
                                members={members}
                                projectName={projectName}
                                onClick={() => router.push(`/projects/${projectId}`)}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                      {isExpanded && memberBalls.length === 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-2 text-center text-sm text-gray-400 border-t border-gray-100">
                            保持中のボールはありません
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Toss Dialog - CUE! style */}
      <Dialog open={!!tossDialog} onOpenChange={() => setTossDialog(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">⚾ ボールを投げる</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 text-center border border-teal-100">
              <p className="text-xs text-gray-400">投げるボール</p>
              <p className="font-bold text-[#1B1B27] mt-1">{tossDialog?.ball.title}</p>
            </div>
            <Select value={tossTarget} onValueChange={setTossTarget}>
              <SelectTrigger className="h-12 rounded-xl border-gray-200">
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
              className="w-full h-12 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-xl text-base font-bold text-white"
              disabled={!tossTarget}
              onClick={handleToss}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              投げる ⚾
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
