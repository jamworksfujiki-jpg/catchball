"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  onBallsChange,
  onMembersChange,
  getBalls,
  createBall,
  updateBall,
  getPipelines,
  updateProject,
} from "@/lib/firestore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Project,
  Ball,
  Member,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { companyId, user, member } = useAuth();
  const projectId = params.projectId as string;

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
    return () => { unsub1(); unsub2(); };
  }, [companyId, projectId]);

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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Confetti show={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/projects")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
            <Badge variant="secondary">{PROJECT_STATUS_LABELS[project.status]}</Badge>
          </div>
          <p className="text-gray-500 text-sm">{project.clientName} {project.address && `・ ${project.address}`}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/projects/${projectId}/board`)}>
            <Kanban className="w-4 h-4 mr-2" />
            ボード
          </Button>
          <Button variant="outline" onClick={() => router.push(`/projects/${projectId}/chat`)}>
            <MessageSquare className="w-4 h-4 mr-2" />
            チャット
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">全体の進捗</span>
            <span className="text-sm font-medium">{completedBalls}/{totalBalls} 完了</span>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">工程表</TabsTrigger>
          <TabsTrigger value="all">すべてのボール</TabsTrigger>
        </TabsList>

        {/* Timeline View */}
        <TabsContent value="timeline" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setAddBallDialog(true)} className="bg-blue-500 hover:bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              ボールを追加
            </Button>
          </div>

          {pipeline?.stages.map((stage, i) => {
            const stageBalls = stageMap.get(stage.id) || [];
            const allCompleted = stageBalls.length > 0 && stageBalls.every((b) => b.status === "completed");
            const hasActive = stageBalls.some((b) => b.status !== "completed");

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className={cn(
                  "border-0 shadow-sm",
                  allCompleted && "opacity-60",
                  hasActive && "ring-2 ring-blue-200"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        allCompleted ? "bg-green-100 text-green-600" :
                        hasActive ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
                      )}>
                        {allCompleted ? <Check className="w-4 h-4" /> : i + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800">{stage.name}</h3>
                        <p className="text-xs text-gray-400">{stage.description} ・ 目安{stage.estimatedDays}日 ・ {stage.defaultAssigneeRole}</p>
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
                <CardTitle className="text-base text-orange-600">⚡ 割り込みボール</CardTitle>
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
        </TabsContent>

        {/* All Balls View */}
        <TabsContent value="all" className="space-y-3">
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
        </TabsContent>
      </Tabs>

      {/* Add Ball Dialog */}
      <Dialog open={addBallDialog} onOpenChange={setAddBallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚾ 新しいボールを追加</DialogTitle>
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
              <Select value={newBall.holderId} onValueChange={(v) => setNewBall({ ...newBall, holderId: v })}>
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
                <Select value={newBall.stageId} onValueChange={(v) => setNewBall({ ...newBall, stageId: v, isInterruption: false })}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="工程を選択（割り込みの場合は空欄）" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipeline.stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>優先度</Label>
              <Select value={newBall.priority} onValueChange={(v) => setNewBall({ ...newBall, priority: v as Ball["priority"] })}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">通常</SelectItem>
                  <SelectItem value="urgent">急ぎ 🔥</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full h-11 bg-blue-500 hover:bg-blue-600"
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
            <DialogTitle>⚾ ボールを投げる</DialogTitle>
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
                {members.filter((m) => m.uid !== user?.uid).map((m) => (
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
