"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { onProjectsChange, onMembersChange, getBalls, updateBall } from "@/lib/firestore";
import { Project, Ball, Member, getBallTemperature, BALL_TEMP_CONFIG } from "@/types";
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
import { ChevronRight, Users, FolderOpen, ArrowRight, Zap, Check } from "lucide-react";

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
type PairData = { iThrew: BallEntry[]; theyThrew: BallEntry[] };

// ============ Compact Ball Dot ============
function BallCircle({ entry, isMyBall, onComplete, onToss, onClick }: {
  entry: BallEntry;
  isMyBall?: boolean;
  onComplete?: () => void;
  onToss?: () => void;
  onClick?: () => void;
}) {
  const { ball, projectName } = entry;
  const holdingSince = ball.holdingSince?.toDate?.() || new Date(ball.holdingSince as any);
  const temp = getBallTemperature(holdingSince);
  const isBurning = temp === "burning";
  const isHot = temp === "hot";
  const isUrgent = ball.priority === "urgent";

  const bgColor = isBurning || isUrgent
    ? "bg-red-500"
    : isHot
    ? "bg-orange-500"
    : "bg-teal-500";

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="group relative"
    >
      <div
        onClick={onClick}
        className={cn(
          "relative w-11 h-11 rounded-full flex items-center justify-center cursor-pointer",
          "shadow hover:shadow-md transition-all hover:scale-125",
          bgColor,
          isBurning && "animate-shake",
        )}
        title={`${ball.title}\n${projectName}`}
      >
        <span className="text-[7px] font-bold text-white text-center leading-tight px-0.5 line-clamp-2">
          {ball.title.length > 5 ? ball.title.slice(0, 4) + ".." : ball.title}
        </span>
        {isUrgent && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-600 rounded-full text-white text-[7px] font-bold flex items-center justify-center shadow">!</span>
        )}
        {ball.isInterruption && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 rounded-full text-white text-[7px] font-bold flex items-center justify-center shadow">割</span>
        )}
      </div>
      {/* Hover actions */}
      {isMyBall && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onComplete && (
            <button onClick={(e) => { e.stopPropagation(); onComplete(); }}
              className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 shadow-sm"
              title="完了">
              <Check className="w-2.5 h-2.5" />
            </button>
          )}
          {onToss && (
            <button onClick={(e) => { e.stopPropagation(); onToss(); }}
              className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center hover:bg-teal-600 shadow-sm"
              title="投げる">
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ============ Compact Avatar (horizontal) ============
function CharacterAvatar({ name, color, isMe }: {
  name: string;
  color: string;
  isMe?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow",
        color
      )}>
        {name.slice(0, 1)}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-[#1B1B27] truncate max-w-[72px]">{name}</p>
        {isMe && <p className="text-[9px] text-teal-500 font-medium">あなた</p>}
      </div>
    </div>
  );
}

// ============ Compact Catchball Row with PROMINENT Arrow ============
function CatchballRow({ thrower, receiver, balls, throwerColor, receiverColor, isThrowerMe, isReceiverMe, onComplete, onToss, onBallClick }: {
  thrower: string;
  receiver: string;
  balls: BallEntry[];
  throwerColor: string;
  receiverColor: string;
  isThrowerMe: boolean;
  isReceiverMe: boolean;
  onComplete?: (ball: Ball, projectId: string) => void;
  onToss?: (ball: Ball, projectId: string) => void;
  onBallClick?: (projectId: string) => void;
}) {
  if (balls.length === 0) return null;

  return (
    <div className="flex items-center gap-3 py-2.5">
      {/* Thrower */}
      <CharacterAvatar
        name={thrower}
        color={isThrowerMe ? "bg-teal-500" : throwerColor}
        isMe={isThrowerMe}
      />

      {/* Ball flow area with PROMINENT arrow */}
      <div className="flex-1 min-w-0 flex items-center gap-2 relative py-1">
        {/* ===== PROMINENT Direction Arrow (単色) ===== */}
        <div className="absolute inset-0 flex items-center pointer-events-none">
          <div className="flex-1 mx-2 border-t-[3px] border-dashed border-teal-400/40" />
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          <ChevronRight className="w-7 h-7 text-teal-400/40 -mr-4" />
          <ChevronRight className="w-7 h-7 text-teal-400/40 -mr-4" />
          <ChevronRight className="w-7 h-7 text-teal-400/40" />
        </div>

        {/* Balls */}
        <div className="flex items-center gap-1.5 flex-wrap relative z-10 px-1">
          {balls.map((entry) => (
            <BallCircle
              key={entry.ball.id}
              entry={entry}
              isMyBall={isReceiverMe}
              onComplete={isReceiverMe && onComplete ? () => onComplete(entry.ball, entry.projectId) : undefined}
              onToss={isReceiverMe && onToss ? () => onToss(entry.ball, entry.projectId) : undefined}
              onClick={onBallClick ? () => onBallClick(entry.projectId) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Ball count badge */}
      <span className="text-[10px] font-bold text-teal-500 bg-teal-50 rounded-full px-2 py-0.5 shrink-0">
        {balls.length}
      </span>

      {/* Receiver */}
      <CharacterAvatar
        name={receiver}
        color={isReceiverMe ? "bg-teal-500" : receiverColor}
        isMe={isReceiverMe}
      />
    </div>
  );
}

// ============ Main Dashboard ============
export default function DashboardPage() {
  const { user, member, company, companyId } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [allActiveBalls, setAllActiveBalls] = useState<BallEntry[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [tossDialog, setTossDialog] = useState<{ ball: Ball; projectId: string } | null>(null);
  const [tossTarget, setTossTarget] = useState("");
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    const unsub1 = onProjectsChange(companyId, setProjects);
    const unsub2 = onMembersChange(companyId, setMembers);
    return () => { unsub1(); unsub2(); };
  }, [companyId]);

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
      const entries: BallEntry[] = [];
      for (const proj of projects) {
        if (proj.status === "completed" || proj.status === "cancelled") continue;
        const balls = await getBalls(companyId!, proj.id);
        for (const ball of balls) {
          if (ball.status === "completed") continue;
          entries.push({ ball, projectName: proj.name, projectId: proj.id });
        }
      }
      if (!cancelled) setAllActiveBalls(entries);
    }

    loadBalls();
    const interval = setInterval(loadBalls, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [companyId, user, projects]);

  // Build catchball pairs: me ↔ each member
  const { catchballPairs, myBalls, thrownBalls } = useMemo(() => {
    if (!user) return { catchballPairs: new Map<string, PairData>(), myBalls: [] as BallEntry[], thrownBalls: [] as BallEntry[] };

    const pairs = new Map<string, PairData>();
    const my: BallEntry[] = [];
    const thrown: BallEntry[] = [];

    for (const entry of allActiveBalls) {
      const { ball } = entry;
      const isMyBall = ball.holderId === user.uid;
      const iThrewIt = ball.thrownBy === user.uid;

      if (isMyBall) my.push(entry);
      if (iThrewIt && !isMyBall) thrown.push(entry);

      // Build pair with the "other" person
      if (isMyBall && ball.thrownBy && ball.thrownBy !== user.uid) {
        // They threw to me
        const pid = ball.thrownBy;
        const existing = pairs.get(pid) || { iThrew: [], theyThrew: [] };
        existing.theyThrew.push(entry);
        pairs.set(pid, existing);
      } else if (iThrewIt && !isMyBall) {
        // I threw to them
        const pid = ball.holderId;
        const existing = pairs.get(pid) || { iThrew: [], theyThrew: [] };
        existing.iThrew.push(entry);
        pairs.set(pid, existing);
      }
    }

    return { catchballPairs: pairs, myBalls: my, thrownBalls: thrown };
  }, [allActiveBalls, user]);

  // Get member colors for avatars
  const MEMBER_COLORS = [
    "bg-slate-500",
    "bg-slate-600",
    "bg-gray-500",
    "bg-slate-400",
  ];

  const memberColorMap = useMemo(() => {
    const map = new Map<string, string>();
    members.filter(m => m.uid !== user?.uid).forEach((m, i) => {
      map.set(m.uid, MEMBER_COLORS[i % MEMBER_COLORS.length]);
    });
    return map;
  }, [members, user]);

  const handleComplete = useCallback(async (ball: Ball, projectId: string) => {
    if (!companyId) return;
    await updateBall(companyId, projectId, ball.id, {
      status: "completed",
      completedAt: Timestamp.now(),
    });
    setShowConfetti(true);
    setAllActiveBalls((prev) => prev.filter((b) => b.ball.id !== ball.id));

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
    setAllActiveBalls((prev) => prev.filter((b) => b.ball.id !== tossDialog.ball.id));
    toast.success(randomMessage(TOSS_MESSAGES));
  }, [companyId, tossDialog, tossTarget, members, user, member]);

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

  const urgentBalls = myBalls.filter((b) => {
    const since = b.ball.holdingSince?.toDate?.() || new Date();
    return getBallTemperature(since) === "burning" || getBallTemperature(since) === "hot";
  });

  const totalCompleted = member?.stats?.completed || 0;
  const streak = member?.stats?.streak || 0;
  const isEmpty = projects.length === 0 && myBalls.length === 0;
  const myName = member?.displayName || user?.displayName || "あなた";

  // Sort pairs: those with more total balls first
  const sortedPairs = useMemo(() => {
    return Array.from(catchballPairs.entries())
      .map(([uid, data]) => {
        const m = members.find(mm => mm.uid === uid);
        return { uid, data, member: m };
      })
      .filter(p => p.member)
      .sort((a, b) => (b.data.iThrew.length + b.data.theyThrew.length) - (a.data.iThrew.length + a.data.theyThrew.length));
  }, [catchballPairs, members]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
          {getGreeting()}、{myName}さん
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          今日もキャッチボールでプロジェクトを前に進めよう
        </p>
      </motion.div>

      {/* Empty state */}
      {isEmpty && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-teal-50 rounded-xl px-5 py-4 border border-teal-200 flex items-center gap-4"
        >
          <span className="text-3xl">⚾</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#1B1B27] text-sm">さあ、キャッチボールを始めよう！</p>
            <p className="text-xs text-gray-400 mt-0.5">案件を作成してチームでタスクを回しましょう</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" className="bg-teal-500 hover:bg-teal-600 text-white h-9 rounded-lg" onClick={() => router.push("/projects")}>
              <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
              案件作成
            </Button>
            <Button variant="outline" size="sm" className="h-9 border-teal-300 text-teal-600 hover:bg-teal-50 rounded-lg" onClick={() => router.push("/team")}>
              <Users className="w-3.5 h-3.5 mr-1.5" />
              招待
            </Button>
            <Button size="sm" className="h-9 bg-amber-500 hover:bg-amber-600 text-white rounded-lg" onClick={handleSeed} disabled={seeding}>
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              {seeding ? "投入中..." : "デモデータ"}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "保持中", value: myBalls.length, icon: "⚾" },
          { label: "要対応", value: urgentBalls.length, icon: "🔥" },
          { label: "連続日数", value: streak, icon: "⚡" },
          { label: "累計完了", value: totalCompleted, icon: "✅" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-xl p-4 bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-lg">{stat.icon}</div>
              <div>
                <p className="text-2xl font-bold text-[#1B1B27]">{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ============ Catchball Relative View ============ */}
      {sortedPairs.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="px-4 py-1.5 rounded-lg text-white text-sm font-bold bg-teal-500">
              ⚾ キャッチボール状況
            </div>
            <span className="text-xs text-gray-400">{sortedPairs.length}人と交換中</span>
          </div>

          <div className="space-y-2">
            {sortedPairs.map(({ uid, data, member: m }, idx) => (
              <motion.div
                key={uid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* Row: あなた → 相手 */}
                {data.iThrew.length > 0 && (
                  <div className="px-4">
                    <CatchballRow
                      thrower={myName}
                      receiver={m!.displayName}
                      balls={data.iThrew}
                      throwerColor="bg-teal-500"
                      receiverColor={memberColorMap.get(uid) || MEMBER_COLORS[0]}
                      isThrowerMe={true}
                      isReceiverMe={false}
                      onBallClick={(pid) => router.push(`/projects/${pid}`)}
                    />
                  </div>
                )}

                {/* Thin divider */}
                {data.iThrew.length > 0 && data.theyThrew.length > 0 && (
                  <div className="mx-4 h-px bg-gray-100" />
                )}

                {/* Row: 相手 → あなた */}
                {data.theyThrew.length > 0 && (
                  <div className="px-4">
                    <CatchballRow
                      thrower={m!.displayName}
                      receiver={myName}
                      balls={data.theyThrew}
                      throwerColor={memberColorMap.get(uid) || MEMBER_COLORS[0]}
                      receiverColor="bg-teal-500"
                      isThrowerMe={false}
                      isReceiverMe={true}
                      onComplete={(ball, projectId) => handleComplete(ball, projectId)}
                      onToss={(ball, projectId) => setTossDialog({ ball, projectId })}
                      onBallClick={(pid) => router.push(`/projects/${pid}`)}
                    />
                  </div>
                )}

                {/* Compact footer */}
                <div className="bg-gray-50/80 px-4 py-1.5 flex items-center justify-between border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400">{m!.jobTitle}</span>
                    <Badge className="text-[9px] bg-gray-100 text-gray-500 border-0 px-1.5 py-0">{m!.role === "external" ? "外注" : "社内"}</Badge>
                  </div>
                  <span className="text-[10px] font-bold text-teal-500">
                    計{data.iThrew.length + data.theyThrew.length}個
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* No active balls message */}
      {sortedPairs.length === 0 && !isEmpty && myBalls.length === 0 && thrownBalls.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
          <div className="text-4xl mb-3">✨</div>
          <p className="text-sm font-bold text-[#3C3939]">オールクリア！</p>
          <p className="text-xs text-gray-400 mt-1">やり取り中のボールはありません</p>
        </div>
      )}

      {/* Active Projects */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <div className="px-4 py-1.5 rounded-lg text-white text-sm font-bold bg-teal-500">
            進行中の案件
          </div>
          <button
            className="ml-auto text-xs text-gray-400 hover:text-teal-600 flex items-center gap-0.5 transition-colors"
            onClick={() => router.push("/projects")}
          >
            すべて見る <ChevronRight className="w-3 h-3" />
          </button>
        </div>
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
                <Badge className={cn("text-xs border-0", proj.status === "active" ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-600")}>
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

      {/* Toss Dialog */}
      <Dialog open={!!tossDialog} onOpenChange={() => setTossDialog(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">⚾ ボールを投げる</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-teal-50 rounded-xl p-4 text-center border border-teal-100">
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
              className="w-full h-12 bg-teal-500 hover:from-teal-600 hover:to-cyan-600 rounded-xl text-base font-bold text-white"
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
