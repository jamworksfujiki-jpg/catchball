"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project, Ball, Pipeline, PipelineStage, getBallTemperature, BALL_TEMP_CONFIG } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { Check, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CustomerProgressPage() {
  const params = useParams();
  const token = params.token as string;

  const [project, setProject] = useState<Project | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // Search all companies for a project with this share token
        const companiesSnap = await getDocs(collection(db, "companies"));
        for (const compDoc of companiesSnap.docs) {
          const projsSnap = await getDocs(
            query(
              collection(db, "companies", compDoc.id, "projects"),
              where("customerShareToken", "==", token)
            )
          );
          if (!projsSnap.empty) {
            const projDoc = projsSnap.docs[0];
            const proj = { id: projDoc.id, ...projDoc.data() } as Project;
            setProject(proj);

            // Load pipeline
            const pipSnap = await getDocs(collection(db, "companies", compDoc.id, "pipelines"));
            const pip = pipSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Pipeline).find(p => p.id === proj.pipelineId);
            if (pip) setPipeline(pip);

            // Load balls
            const ballsSnap = await getDocs(
              query(
                collection(db, "companies", compDoc.id, "projects", proj.id, "balls"),
                orderBy("stageOrder", "asc")
              )
            );
            setBalls(ballsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Ball));
            setLoading(false);
            return;
          }
        }
        setError(true);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <Card className="border-0 shadow-xl max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-xl font-bold mb-2">ページが見つかりません</h2>
            <p className="text-gray-500">このリンクは無効か、期限切れです。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedBalls = balls.filter(b => b.status === "completed").length;
  const totalBalls = balls.length;
  const progress = totalBalls > 0 ? (completedBalls / totalBalls) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <span className="text-4xl">⚾</span>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">{project.name}</h1>
          <p className="text-gray-500">工事の進捗状況</p>
        </div>

        {/* Progress */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between mb-3">
              <span className="text-gray-600 font-medium">全体の進捗</span>
              <span className="text-blue-600 font-bold">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-4" />
            <p className="text-sm text-gray-400 mt-2">{completedBalls}/{totalBalls} 工程完了</p>
          </CardContent>
        </Card>

        {/* Stages */}
        <div className="space-y-3">
          {pipeline?.stages.map((stage, i) => {
            const stageBalls = balls.filter(b => b.stageId === stage.id);
            const allCompleted = stageBalls.length > 0 && stageBalls.every(b => b.status === "completed");
            const hasActive = stageBalls.some(b => b.status !== "completed" && b.status !== "waiting");

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className={cn(
                  "border-0 shadow-sm",
                  allCompleted && "bg-green-50",
                  hasActive && "ring-2 ring-blue-200"
                )}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                      allCompleted ? "bg-green-500 text-white" :
                      hasActive ? "bg-teal-500 text-white" : "bg-gray-200 text-gray-400"
                    )}>
                      {allCompleted ? <Check className="w-5 h-5" /> : i + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className={cn(
                        "font-medium",
                        allCompleted ? "text-green-700" : "text-gray-800"
                      )}>
                        {stage.name}
                      </h3>
                      <p className="text-xs text-gray-400">{stage.description}</p>
                    </div>
                    {allCompleted && <Badge className="bg-green-100 text-green-700">完了</Badge>}
                    {hasActive && <Badge className="bg-blue-100 text-blue-700">進行中</Badge>}
                    {!allCompleted && !hasActive && stageBalls.length === 0 && (
                      <Badge variant="secondary">未着手</Badge>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Contact Info Section */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gray-700">📞 お問い合わせ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-500">
              工事に関するご質問やご要望がございましたら、担当者までお気軽にお問い合わせください。
            </p>
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">物件名:</span>
                <span className="font-medium text-gray-700">{project.name}</span>
              </div>
              {project.clientName && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">お客様名:</span>
                  <span className="font-medium text-gray-700">{project.clientName}</span>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">
                ※ このページのURLを担当者にお伝えいただくとスムーズです。
              </p>
            </div>
          </CardContent>
        </Card>

        <footer className="text-center text-xs text-gray-400 py-8">
          Powered by キャッチボール ⚾
        </footer>
      </div>
    </div>
  );
}
