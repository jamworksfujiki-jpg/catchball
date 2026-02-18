"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { onProjectsChange, onMembersChange, getBalls, updateBall } from "@/lib/firestore";
import { Project, Ball, Member } from "@/types";
import { BallCard } from "@/components/ball/BallCard";
import { Confetti } from "@/components/celebration/Confetti";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner";

interface BallWithProject {
  ball: Ball;
  projectName: string;
  projectId: string;
}

export default function BallsPage() {
  const { user, member, companyId } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [allBalls, setAllBalls] = useState<BallWithProject[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [tossDialog, setTossDialog] = useState<BallWithProject | null>(null);
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
      const balls: BallWithProject[] = [];
      for (const proj of projects) {
        if (proj.status === "cancelled") continue;
        const projBalls = await getBalls(companyId!, proj.id);
        for (const ball of projBalls) {
          if (ball.holderId === user!.uid) {
            balls.push({ ball, projectName: proj.name, projectId: proj.id });
          }
        }
      }
      if (!cancelled) setAllBalls(balls);
    }
    loadBalls();
    return () => { cancelled = true; };
  }, [companyId, user, projects]);

  const handleComplete = async (bwp: BallWithProject) => {
    if (!companyId) return;
    await updateBall(companyId, bwp.projectId, bwp.ball.id, {
      status: "completed",
      completedAt: Timestamp.now(),
    });
    setShowConfetti(true);
    setAllBalls((prev) => prev.filter((b) => b.ball.id !== bwp.ball.id));
    toast.success("ナイスキャッチ！");
  };

  const handleToss = async () => {
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
    setAllBalls((prev) => prev.filter((b) => b.ball.id !== tossDialog.ball.id));
    toast.success(`${targetMember?.displayName}さんに投げました！`);
  };

  const activeBalls = allBalls.filter((b) => b.ball.status !== "completed");
  const completedBalls = allBalls.filter((b) => b.ball.status === "completed");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Confetti show={showConfetti} onComplete={() => setShowConfetti(false)} />

      <h1 className="text-2xl font-bold text-gray-800">🏐 マイボール</h1>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">保持中 ({activeBalls.length})</TabsTrigger>
          <TabsTrigger value="completed">完了済み ({completedBalls.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="space-y-3 mt-4">
          {activeBalls.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-4">✨</div>
              <p className="text-lg font-medium">ボールがありません！</p>
              <p className="text-sm">素晴らしい！全部投げました。</p>
            </div>
          ) : (
            <AnimatePresence>
              {activeBalls.map((bwp) => (
                <BallCard
                  key={bwp.ball.id}
                  ball={bwp.ball}
                  members={members}
                  isMyBall
                  projectName={bwp.projectName}
                  onComplete={() => handleComplete(bwp)}
                  onToss={() => setTossDialog(bwp)}
                  onClick={() => router.push(`/projects/${bwp.projectId}`)}
                />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>
        <TabsContent value="completed" className="space-y-3 mt-4">
          <AnimatePresence>
            {completedBalls.map((bwp) => (
              <BallCard
                key={bwp.ball.id}
                ball={bwp.ball}
                members={members}
                projectName={bwp.projectName}
                onClick={() => router.push(`/projects/${bwp.projectId}`)}
              />
            ))}
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      <Dialog open={!!tossDialog} onOpenChange={() => setTossDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚾ ボールを投げる</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-gray-600">「{tossDialog?.ball.title}」を誰に投げますか？</p>
            <Select value={tossTarget} onValueChange={setTossTarget}>
              <SelectTrigger className="h-12"><SelectValue placeholder="受け取る人を選択" /></SelectTrigger>
              <SelectContent>
                {members.filter((m) => m.uid !== user?.uid).map((m) => (
                  <SelectItem key={m.uid} value={m.uid}>{m.displayName}（{m.jobTitle}）</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full h-12 bg-blue-500 hover:bg-blue-600" disabled={!tossTarget} onClick={handleToss}>
              投げる ⚾
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
