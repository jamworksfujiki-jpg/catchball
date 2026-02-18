"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { onProjectsChange, createProject, getPipelines } from "@/lib/firestore";
import { Project, Pipeline, PROJECT_TYPE_LABELS, PROJECT_STATUS_LABELS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { Plus, Search, FolderKanban } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";

export default function ProjectsPage() {
  const { companyId, user, member } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    clientName: "",
    clientPhone: "",
    address: "",
    type: "new_build" as Project["type"],
    pipelineId: "",
  });

  useEffect(() => {
    if (!companyId) return;
    const unsub = onProjectsChange(companyId, setProjects);
    getPipelines(companyId).then(setPipelines);
    return unsub;
  }, [companyId]);

  const handleCreate = async () => {
    if (!companyId || !user) return;
    try {
      const id = await createProject(companyId, {
        ...form,
        status: "planning",
        currentStageIndex: 0,
        assignees: [user.uid],
      });
      toast.success("案件を作成しました！");
      setDialogOpen(false);
      setForm({ name: "", clientName: "", clientPhone: "", address: "", type: "new_build", pipelineId: "" });
      router.push(`/projects/${id}`);
    } catch {
      toast.error("作成に失敗しました");
    }
  };

  const filtered = projects.filter(
    (p) =>
      p.name.includes(search) ||
      p.clientName.includes(search)
  );

  const statusColors: Record<string, string> = {
    planning: "bg-yellow-100 text-yellow-700",
    active: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🏗️ 案件一覧</h1>
          <p className="text-gray-500 text-sm mt-1">すべての工事案件を管理</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-500 hover:bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              新規案件
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>新しい案件を作成</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>案件名</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="田中邸新築工事"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>施主名</Label>
                <Input
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  placeholder="田中太郎"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>電話番号</Label>
                <Input
                  value={form.clientPhone}
                  onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
                  placeholder="090-1234-5678"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>住所</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="東京都..."
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>工事種別</Label>
                <Select value={form.type} onValueChange={(v) => {
                  setForm({ ...form, type: v as Project["type"] });
                  const matched = pipelines.find((p) => p.type === v);
                  if (matched) setForm((prev) => ({ ...prev, pipelineId: matched.id }));
                }}>
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
              <div className="space-y-2">
                <Label>パイプライン</Label>
                <Select value={form.pipelineId} onValueChange={(v) => setForm({ ...form, pipelineId: v })}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="パイプラインを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}（{p.stages.length}工程）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full h-11 bg-blue-500 hover:bg-blue-600"
                disabled={!form.name || !form.clientName || !form.pipelineId}
                onClick={handleCreate}
              >
                作成する
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="案件名・施主名で検索..."
          className="pl-10 h-11"
        />
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((proj, i) => (
          <motion.div
            key={proj.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card
              className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => router.push(`/projects/${proj.id}`)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">
                    {proj.type === "new_build" ? "🏠" : proj.type === "renovation" ? "🔨" : proj.type === "painting" ? "🎨" : "🏗️"}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">{proj.name}</h3>
                    <p className="text-sm text-gray-400">{proj.clientName} ・ {PROJECT_TYPE_LABELS[proj.type]}</p>
                  </div>
                </div>
                <Badge className={statusColors[proj.status]}>
                  {PROJECT_STATUS_LABELS[proj.status]}
                </Badge>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <FolderKanban className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>案件がありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
