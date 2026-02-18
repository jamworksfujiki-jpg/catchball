"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { onPipelinesChange, createPipeline, deletePipeline } from "@/lib/firestore";
import { Pipeline, PROJECT_TYPE_LABELS } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { motion } from "framer-motion";
import { Plus, GitBranch, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function PipelinesPage() {
  const { companyId } = useAuth();
  const router = useRouter();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<Pipeline["type"]>("custom");

  useEffect(() => {
    if (!companyId) return;
    return onPipelinesChange(companyId, setPipelines);
  }, [companyId]);

  const handleCreate = async () => {
    if (!companyId || !name) return;
    await createPipeline(companyId, { name, type, stages: [] });
    setDialogOpen(false);
    setName("");
    toast.success("パイプラインを作成しました");
  };

  const handleDelete = async (id: string) => {
    if (!companyId) return;
    if (!confirm("このパイプラインを削除しますか？")) return;
    await deletePipeline(companyId, id);
    toast.success("削除しました");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🔀 パイプライン</h1>
          <p className="text-gray-500 text-sm mt-1">工事種別ごとの工程テンプレートを管理</p>
        </div>
        <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          新規作成
        </Button>
      </div>

      <div className="space-y-3">
        {pipelines.map((pipeline, i) => (
          <motion.div
            key={pipeline.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-0 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-4 flex items-center justify-between">
                <div
                  className="flex items-center gap-4 flex-1 cursor-pointer"
                  onClick={() => router.push(`/pipelines/${pipeline.id}`)}
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <GitBranch className="w-6 h-6 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">{pipeline.name}</h3>
                    <p className="text-sm text-gray-400">
                      {PROJECT_TYPE_LABELS[pipeline.type]} ・ {pipeline.stages.length}工程
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/pipelines/${pipeline.id}`)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(pipeline.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しいパイプラインを作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>パイプライン名</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="マンション大規模修繕"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>工事種別</Label>
              <Select value={type} onValueChange={(v) => setType(v as Pipeline["type"])}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROJECT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full h-11 bg-blue-500 hover:bg-blue-600"
              disabled={!name}
              onClick={handleCreate}
            >
              作成する
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
