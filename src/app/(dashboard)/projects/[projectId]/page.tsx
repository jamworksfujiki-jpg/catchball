"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  onBallsChange,
  onMembersChange,
  createBall,
  updateBall,
  getPipelines,
  updateProject,
  onMessagesChange,
  createMessage,
} from "@/lib/firestore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Project,
  Ball,
  Member,
  Message,
  Pipeline,
  PipelineStage,
  getBallTemperature,
  BALL_TEMP_CONFIG,
  BALL_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
} from "@/types";
import { BallCard } from "@/components/ball/BallCard";
import { Confetti } from "@/components/celebration/Confetti";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import {
  Plus,
  ArrowLeft,
  Check,
  Clock,
  ArrowRight,
  MessageSquare,
  Kanban,
  Send,
  CirclePlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { companyId, user, member } = useAuth();
  const projectId = params.projectId as string;

  // Project & ball state
  const [project, setProject] = useState<Project | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [addBallDialog, setAddBallDialog] = useState(false);
  const [tossDialog, setTossDialog] = useState<Ball | null>(null);
  const [tossTarget, setTossTarget] = useState("");
  const [newBall, setNewBall] = useState({
    title: "",
    description: "",
    holderId: "",
    stageId: "",
    priority: "normal" as Ball["priority"],
    isInterruption: false,
  });

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatText, setChatText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Inline ball creation from chat
  const [showInlineBallForm, setShowInlineBallForm] = useState(false);
  const [inlineBall, setInlineBall] = useState({
    title: "",
    holderId: "",
    priority: "normal" as Ball["priority"],
  });

  // Mobile tab state (includes chat tab on mobile)
  const [mobileTab, setMobileTab] = useState<"timeline" | "all" | "chat">("timeline");

  // Load project, balls, members, messages
  useEffect(() => {
    if (!companyId || !projectId) return;

    async function loadProject() {
      const projDoc = await getDoc(doc(db, "companies", companyId!, "projects", projectId));
      if (projDoc.exists()) {
        const projData = { id: projDoc.id, ...projDoc.data() } as Project;
        setProject(projData);
        const pips = await getPipelines(companyId!);
        const pip = pips.find((p) => p.id === projData.pipelineId);
        if (pip) setPipeline(pip);
      }
    }
    loadProject();
    const unsub1 = onBallsChange(companyId, projectId, setBalls);
    const unsub2 = onMembersChange(companyId, setMembers);
    const unsub3 = onMessagesChange(companyId, projectId, setMessages);
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [companyId, projectId]);

  // Auto-scroll chat on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // === Ball handlers ===
  const handleAddBall = async () => {
    if (!companyId || !projectId || !user) return;
    const targetMember = members.find((m) => m.uid === newBall.holderId);
    const maxOrder = balls.reduce((max, b) => Math.max(max, b.stageOrder), 0);

    let stageOrder = maxOrder + 1;
    if (newBall.stageId && pipeline) {
      const stage = pipeline.stages.find((s) => s.id === newBall.stageId);
      if (stage) stageOrder = stage.order + 0.5;
    }

    await createBall(companyId, projectId, {
      title: newBall.title,
      description: newBall.description,
      holderId: newBall.holderId || user.uid,
      holderName: targetMember?.displayName || member?.displayName || "",
      thrownBy: user.uid,
      thrownByName: member?.displayName || "",
      stageId: newBall.stageId || undefined,
      stageOrder,
      status: "holding",
      priority: newBall.priority,
      holdingSince: Timestamp.now(),
      requiresApproval: false,
      isInterruption: newBall.isInterruption || !newBall.stageId,
    });
    setAddBallDialog(false);
    setNewBall({ title: "", description: "", holderId: "", stageId: "", priority: "normal", isInterruption: false });
    toast.success("ボールを追加しました！");
  };

  const handleComplete = async (ball: Ball) => {
    if (!companyId) return;
    await updateBall(companyId, projectId, ball.id, {
      status: "completed",
      completedAt: Timestamp.now(),
    });
    setShowConfetti(true);
    toast.success("ナイスキャッチ！");
  };

  const handleToss = async () => {
    if (!companyId || !tossDialog || !tossTarget) return;
    const targetMember = members.find((m) => m.uid === tossTarget);
    await updateBall(companyId, projectId, tossDialog.id, {
      holderId: tossTarget,
      holderName: targetMember?.displayName || "",
      thrownBy: user!.uid,
      thrownByName: member?.displayName || "",
      holdingSince: Timestamp.now(),
      status: "holding",
    });
    setTossDialog(null);
    setTossTarget("");
    toast.success(`${targetMember?.displayName}さんに投げました！`);
  };

  // === Chat handlers ===
  const handleSendMessage = async () => {
    if (!chatText.trim() || !companyId || !user) return;
    await createMessage(companyId, projectId, {
      senderId: user.uid,
      senderName: member?.displayName || user.displayName || "匿名",
      text: chatText.trim(),
    });
    setChatText("");
  };

  // === Inline ball creation from chat ===
  const handleInlineBallCreate = async () => {
    if (!inlineBall.title.trim() || !companyId || !projectId || !user) return;
    const targetMember = members.find((m) => m.uid === inlineBall.holderId);
    const assigneeName = targetMember?.displayName || member?.displayName || "";
    const assigneeId = inlineBall.holderId || user.uid;
    const maxOrder = balls.reduce((max, b) => Math.max(max, b.stageOrder), 0);

    await createBall(companyId, projectId, {
      title: inlineBall.title.trim(),
      description: "",
      holderId: assigneeId,
      holderName: assigneeName,
      thrownBy: user.uid,
      thrownByName: member?.displayName || "",
      stageId: undefined,
      stageOrder: maxOrder + 1,
      status: "holding",
      priority: inlineBall.priority,
      holdingSince: Timestamp.now(),
      requiresApproval: false,
      isInterruption: true,
    });

    // Post system message in chat
    const finalAssigneeName = targetMember?.displayName || member?.displayName || "自分";
    await createMessage(companyId, projectId, {
      senderId: user.uid,
      senderName: member?.displayName || user.displayName || "匿名",
      text: `🏐 ボール「${inlineBall.title.trim()}」を作成 → ${finalAssigneeName}`,
    });

    setInlineBall({ title: "", holderId: "", priority: "normal" });
    setShowInlineBallForm(false);
    toast.success("ボールを追加しました！");
  };

  if (!project) return null;

  const completedBalls = balls.filter((b) => b.status === "completed").length;
  const totalBalls = balls.length;
  const progress = totalBalls > 0 ? (completedBalls / totalBalls) * 100 : 0;

  // Group balls by pipeline stage
  const stageMap = new Map<string, Ball[]>();
  const interruptionBalls: Ball[] = [];
  balls.forEach((b) => {
    if (b.isInterruption || !b.stageId) {
      interruptionBalls.push(b);
    } else {
      const arr = stageMap.get(b.stageId) || [];
      arr.push(b);
      stageMap.set(b.stageId, arr);
    }
  });

  // ============ Chat Panel Component (reused in desktop sidebar and mobile tab) ============
  const ChatPanel = ({ className }: { className?: string }) => (
    <div className={cn("flex flex-col", className)}>
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            まだメッセージがありません
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.uid;
          const time = msg.createdAt?.toDate?.()
            ? format(msg.createdAt.toDate(), "HH:mm", { locale: ja })
            : "";
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex gap-2", isMe && "flex-row-reverse")}
            >
              {!isMe && (
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarFallback className="text-[10px] bg-blue-100 text-blue-600">
                    {msg.senderName?.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={cn("max-w-[80%]", isMe && "text-right")}>
                {!isMe && <p className="text-[10px] text-gray-400 mb-0.5">{msg.senderName}</p>}
                <div
                  className={cn(
                    "rounded-2xl px-3 py-1.5 inline-block text-sm",
                    isMe
                      ? "bg-teal-500 text-white rounded-br-none"
                      : "bg-gray-100 text-gray-800 rounded-bl-none"
                  )}
                >
                  {msg.text}
                </div>
                <p className="text-[10px] text-gray-300 mt-0.5">{time}</p>
              </div>
            </motion.div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Inline ball creation form */}
      <AnimatePresence>
        {showInlineBallForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t bg-blue-50"
          >
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700">ボールを作成</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowInlineBallForm(false)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <Input
                value={inlineBall.title}
                onChange={(e) => setInlineBall({ ...inlineBall, title: e.target.value })}
                placeholder="ボールの内容"
                className="h-9 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && inlineBall.title.trim()) {
                    handleInlineBallCreate();
                  }
                }}
              />
              <div className="flex gap-2">
                <Select
                  value={inlineBall.holderId}
                  onValueChange={(v) => setInlineBall({ ...inlineBall, holderId: v })}
                >
                  <SelectTrigger className="h-9 text-xs flex-1">
                    <SelectValue placeholder="担当者（自分）" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.uid} value={m.uid} className="text-xs">
                        {m.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={inlineBall.priority}
                  onValueChange={(v) =>
                    setInlineBall({ ...inlineBall, priority: v as Ball["priority"] })
                  }
                >
                  <SelectTrigger className="h-9 text-xs w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal" className="text-xs">通常</SelectItem>
                    <SelectItem value="urgent" className="text-xs">急ぎ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full h-9 text-sm bg-teal-500 hover:bg-teal-600"
                disabled={!inlineBall.title.trim()}
                onClick={handleInlineBallCreate}
              >
                作成する
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat input */}
      <div className="p-3 border-t bg-white">
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 border-blue-200 text-blue-500 hover:bg-blue-50"
            onClick={() => setShowInlineBallForm(!showInlineBallForm)}
            title="ボールを作成"
          >
            <CirclePlus className="w-5 h-5" />
          </Button>
          <Input
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
            placeholder="メッセージ..."
            className="h-10 text-sm"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!chatText.trim()}
            className="h-10 bg-teal-500 hover:bg-teal-600 shrink-0"
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // ============ Main content (timeline + all balls tabs) ============
  const MainContent = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddBallDialog(true)} className="bg-teal-500 hover:bg-teal-600">
          <Plus className="w-4 h-4 mr-2" />
          ボールを追加
        </Button>
      </div>

      {pipeline?.stages.map((stage, i) => {
        const stageBalls = stageMap.get(stage.id) || [];
        const allCompleted =
          stageBalls.length > 0 && stageBalls.every((b) => b.status === "completed");
        const hasActive = stageBalls.some((b) => b.status !== "completed");

        return (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card
              className={cn(
                "border-0 shadow-sm",
                allCompleted && "opacity-60",
                hasActive && "ring-2 ring-blue-200"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      allCompleted
                        ? "bg-green-100 text-green-600"
                        : hasActive
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-400"
                    )}
                  >
                    {allCompleted ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{stage.name}</h3>
                    <p className="text-xs text-gray-400">
                      {stage.description} ・ 目安{stage.estimatedDays}日 ・{" "}
                      {stage.defaultAssigneeRole}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNewBall({ ...newBall, stageId: stage.id, isInterruption: false });
                      setAddBallDialog(true);
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                {stageBalls.length > 0 && (
                  <div className="ml-11 space-y-2">
                    <AnimatePresence>
                      {stageBalls.map((ball) => (
                        <BallCard
                          key={ball.id}
                          ball={ball}
                          members={members}
                          isMyBall={ball.holderId === user?.uid}
                          onComplete={handleComplete}
                          onToss={(b) => setTossDialog(b)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      {/* Interruption balls */}
      {interruptionBalls.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-orange-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-orange-600">割り込みボール</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {interruptionBalls.map((ball) => (
              <BallCard
                key={ball.id}
                ball={ball}
                members={members}
                isMyBall={ball.holderId === user?.uid}
                onComplete={handleComplete}
                onToss={(b) => setTossDialog(b)}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );

  const AllBallsContent = () => (
    <div className="space-y-3">
      <AnimatePresence>
        {balls.map((ball) => (
          <BallCard
            key={ball.id}
            ball={ball}
            members={members}
            isMyBall={ball.holderId === user?.uid}
            onComplete={handleComplete}
            onToss={(b) => setTossDialog(b)}
          />
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <Confetti show={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/projects")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800 truncate">{project.name}</h1>
            <Badge variant="secondary">{PROJECT_STATUS_LABELS[project.status]}</Badge>
          </div>
          <p className="text-gray-500 text-sm truncate">
            {project.clientName} {project.address && `・ ${project.address}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/projects/${projectId}/board`)}>
            <Kanban className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">ボード</span>
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">全体の進捗</span>
            <span className="text-sm font-medium">
              {completedBalls}/{totalBalls} 完了
            </span>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {/* ====== DESKTOP: 2-column layout ====== */}
      <div className="hidden md:flex gap-4">
        {/* Left column: Tabs (timeline / all balls) */}
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="timeline" className="space-y-4">
            <TabsList>
              <TabsTrigger value="timeline">工程表</TabsTrigger>
              <TabsTrigger value="all">すべてのボール</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline">
              <MainContent />
            </TabsContent>
            <TabsContent value="all">
              <AllBallsContent />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column: Chat panel */}
        <div className="w-[380px] shrink-0">
          <Card className="border-0 shadow-sm sticky top-4 flex flex-col h-[calc(100vh-14rem)] overflow-hidden">
            <CardHeader className="pb-2 pt-3 px-3 shrink-0">
              <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
                <MessageSquare className="w-4 h-4" />
                チャット
              </CardTitle>
            </CardHeader>
            <ChatPanel className="flex-1 min-h-0" />
          </Card>
        </div>
      </div>

      {/* ====== MOBILE: Tabs including chat ====== */}
      <div className="md:hidden">
        <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as typeof mobileTab)} className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="timeline" className="flex-1">工程表</TabsTrigger>
            <TabsTrigger value="all" className="flex-1">ボール</TabsTrigger>
            <TabsTrigger value="chat" className="flex-1">
              <MessageSquare className="w-3.5 h-3.5 mr-1" />
              チャット
            </TabsTrigger>
          </TabsList>
          <TabsContent value="timeline">
            <MainContent />
          </TabsContent>
          <TabsContent value="all">
            <AllBallsContent />
          </TabsContent>
          <TabsContent value="chat">
            <Card className="border-0 shadow-sm flex flex-col h-[calc(100vh-18rem)] overflow-hidden">
              <ChatPanel className="flex-1 min-h-0" />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Ball Dialog */}
      <Dialog open={addBallDialog} onOpenChange={setAddBallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しいボールを追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>ボールの内容</Label>
              <Input
                value={newBall.title}
                onChange={(e) => setNewBall({ ...newBall, title: e.target.value })}
                placeholder="見積書の作成"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>詳細メモ</Label>
              <Textarea
                value={newBall.description}
                onChange={(e) => setNewBall({ ...newBall, description: e.target.value })}
                placeholder="補足情報があれば..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>誰に渡す？</Label>
              <Select
                value={newBall.holderId}
                onValueChange={(v) => setNewBall({ ...newBall, holderId: v })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="自分" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.uid} value={m.uid}>
                      {m.displayName}（{m.jobTitle}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {pipeline && (
              <div className="space-y-2">
                <Label>工程（任意）</Label>
                <Select
                  value={newBall.stageId}
                  onValueChange={(v) =>
                    setNewBall({ ...newBall, stageId: v, isInterruption: false })
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="工程を選択（割り込みの場合は空欄）" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipeline.stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>優先度</Label>
              <Select
                value={newBall.priority}
                onValueChange={(v) =>
                  setNewBall({ ...newBall, priority: v as Ball["priority"] })
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">通常</SelectItem>
                  <SelectItem value="urgent">急ぎ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full h-11 bg-teal-500 hover:bg-teal-600"
              disabled={!newBall.title}
              onClick={handleAddBall}
            >
              追加する
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toss Dialog */}
      <Dialog open={!!tossDialog} onOpenChange={() => setTossDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ボールを投げる</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-gray-600">
              「{tossDialog?.title}」を誰に投げますか？
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
              className="w-full h-12 bg-teal-500 hover:bg-teal-600"
              disabled={!tossTarget}
              onClick={handleToss}
            >
              投げる
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
