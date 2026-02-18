"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { updatePipeline } from "@/lib/firestore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pipeline, PipelineStage, JOB_TITLES } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Trash2, GripVertical, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PipelineEditPage() {
  const params = useParams();
  const router = useRouter();
  const { companyId } = useAuth();
  const pipelineId = params.pipelineId as string;

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId || !pipelineId) return;
    async function load() {
      const pipDoc = await getDoc(doc(db, "companies", companyId!, "pipelines", pipelineId));
      if (pipDoc.exists()) {
        const data = { id: pipDoc.id, ...pipDoc.data() } as Pipeline;
        setPipeline(data);
        setStages(data.stages || []);
      }
    }
    load();
  }, [companyId, pipelineId]);

  const addStage = () => {
    const order = stages.length + 1;
    setStages([
      ...stages,
      {
        id: `stage_${Date.now()}`,
        name: "",
        order,
        defaultAssigneeRole: "営業",
        estimatedDays: 1,
        description: "",
      },
    ]);
  };

  const updateStage = (index: number, updates: Partial<PipelineStage>) => {
    setStages(stages.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 })));
  };

  const handleSave = async () => {
    if (!companyId || !pipelineId) return;
    setSaving(true);
    try {
      await updatePipeline(companyId, pipelineId, { stages });
      toast.success("保存しました！");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (!pipeline) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/pipelines")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{pipeline.name}</h1>
            <p className="text-sm text-gray-500">{stages.length}工程</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addStage}>
            <Plus className="w-4 h-4 mr-2" />
            工程を追加
          </Button>
          <Button className="bg-blue-500 hover:bg-blue-600" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {stages.map((stage, i) => (
            <motion.div
              key={stage.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 pt-2">
                      <GripVertical className="w-4 h-4 text-gray-300" />
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </div>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">工程名</Label>
                        <Input
                          value={stage.name}
                          onChange={(e) => updateStage(i, { name: e.target.value })}
                          placeholder="例: 現地調査"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">説明</Label>
                        <Input
                          value={stage.description}
                          onChange={(e) => updateStage(i, { description: e.target.value })}
                          placeholder="工程の説明"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">デフォルト担当</Label>
                        <Select
                          value={stage.defaultAssigneeRole}
                          onValueChange={(v) => updateStage(i, { defaultAssigneeRole: v })}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {JOB_TITLES.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">目安日数</Label>
                        <Input
                          type="number"
                          value={stage.estimatedDays}
                          onChange={(e) => updateStage(i, { estimatedDays: parseInt(e.target.value) || 1 })}
                          min={1}
                          className="h-10"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStage(i)}
                      className="text-red-400 hover:text-red-600 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        {stages.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p>まだ工程がありません</p>
            <Button variant="outline" className="mt-3" onClick={addStage}>
              最初の工程を追加
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
