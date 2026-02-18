"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { onBallsChange, onMembersChange, updateBall } from "@/lib/firestore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project, Ball, Member, BallStatus, getBallTemperature, BALL_TEMP_CONFIG } from "@/types";
import { BallIcon } from "@/components/ball/BallIcon";
import { Confetti } from "@/components/celebration/Confetti";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { Timestamp } from "firebase/firestore";
import { ArrowLeft, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import {
  DndContext,
  closestCorners,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const columns: { id: BallStatus; title: string; icon: string; color: string }[] = [
  { id: "holding", title: "保持中", icon: "📥", color: "bg-blue-50 border-blue-200" },
  { id: "waiting", title: "確認待ち", icon: "👀", color: "bg-purple-50 border-purple-200" },
  { id: "approved", title: "承認済み", icon: "👍", color: "bg-green-50 border-green-200" },
  { id: "completed", title: "完了", icon: "✅", color: "bg-gray-50 border-gray-200" },
];

function SortableBallItem({ ball, members }: { ball: Ball; members: Member[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ball.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const holder = members.find((m) => m.uid === ball.holderId);
  const holdingSince = ball.holdingSince?.toDate?.() || new Date();
  const temperature = ball.status === "completed" ? "cool" as const : getBallTemperature(holdingSince);
  const holdingTime = formatDistanceToNow(holdingSince, { locale: ja, addSuffix: false });

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <motion.div
        layout
        className={cn(
          "bg-white rounded-xl p-3 shadow-sm border cursor-grab active:cursor-grabbing",
          "hover:shadow-md transition-shadow",
          ball.priority === "urgent" && "border-red-300",
          temperature === "burning" && "animate-shake"
        )}
      >
        <div className="flex items-start gap-2">
          <BallIcon temperature={temperature} size="sm" animate={false} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-800 truncate">{ball.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="w-4 h-4">
                <AvatarFallback className="text-[8px] bg-gray-100">
                  {holder?.displayName?.slice(0, 1) || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-400">{holder?.displayName}</span>
              {ball.status !== "completed" && (
                <span className={cn("text-xs", BALL_TEMP_CONFIG[temperature].color)}>
                  <Clock className="w-3 h-3 inline mr-0.5" />{holdingTime}
                </span>
              )}
            </div>
          </div>
          {ball.isInterruption && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 text-orange-500 border-orange-300 shrink-0">
              割込
            </Badge>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function KanbanBoardPage() {
  const params = useParams();
  const router = useRouter();
  const { companyId, user } = useAuth();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeBall, setActiveBall] = useState<Ball | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    if (!companyId || !projectId) return;
    async function load() {
      const projDoc = await getDoc(doc(db, "companies", companyId!, "projects", projectId));
      if (projDoc.exists()) setProject({ id: projDoc.id, ...projDoc.data() } as Project);
    }
    load();
    const unsub1 = onBallsChange(companyId, projectId, setBalls);
    const unsub2 = onMembersChange(companyId, setMembers);
    return () => { unsub1(); unsub2(); };
  }, [companyId, projectId]);

  const handleDragStart = (event: DragStartEvent) => {
    const ball = balls.find((b) => b.id === event.active.id);
    setActiveBall(ball || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveBall(null);
    const { active, over } = event;
    if (!over || !companyId) return;

    const ballId = active.id as string;
    const newStatus = over.id as BallStatus;
    const ball = balls.find((b) => b.id === ballId);
    if (!ball || ball.status === newStatus) return;

    const updates: Partial<Ball> = { status: newStatus };
    if (newStatus === "completed") {
      updates.completedAt = Timestamp.now();
      setShowConfetti(true);
    }

    await updateBall(companyId, projectId, ballId, updates);
    toast.success(newStatus === "completed" ? "ナイスキャッチ！" : "ステータスを更新しました");
  };

  if (!project) return null;

  return (
    <div className="space-y-6">
      <Confetti show={showConfetti} onComplete={() => setShowConfetti(false)} />

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/projects/${projectId}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold text-gray-800">{project.name} - カンバンボード</h1>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((col) => {
            const columnBalls = balls.filter((b) => b.status === col.id);
            return (
              <div key={col.id} className={cn("rounded-xl border-2 border-dashed p-3 min-h-[300px]", col.color)}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-lg">{col.icon}</span>
                  <h3 className="font-medium text-sm text-gray-700">{col.title}</h3>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {columnBalls.length}
                  </Badge>
                </div>
                <SortableContext
                  id={col.id}
                  items={columnBalls.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {columnBalls.map((ball) => (
                      <SortableBallItem key={ball.id} ball={ball} members={members} />
                    ))}
                  </div>
                </SortableContext>
                {columnBalls.length === 0 && (
                  <div className="flex items-center justify-center h-20 text-xs text-gray-400">
                    ここにドラッグ
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
