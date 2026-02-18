"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { onMembersChange, addMember } from "@/lib/firestore";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Member, MEMBER_ROLE_LABELS, JOB_TITLES, getLevelInfo, MemberRole } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

export default function TeamPage() {
  const { companyId } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    role: "member" as MemberRole,
    jobTitle: "営業",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    return onMembersChange(companyId, setMembers);
  }, [companyId]);

  const handleAdd = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(cred.user, { displayName: form.displayName });
      await addMember(companyId, {
        uid: cred.user.uid,
        displayName: form.displayName,
        email: form.email,
        role: form.role,
        jobTitle: form.jobTitle,
        stats: { completed: 0, streak: 0, level: 1 },
      });
      toast.success(`${form.displayName}さんを追加しました！`);
      setDialogOpen(false);
      setForm({ displayName: "", email: "", password: "", role: "member", jobTitle: "営業" });
    } catch (err: any) {
      toast.error("メンバーの追加に失敗しました。メールアドレスが既に使われている可能性があります。");
    } finally {
      setLoading(false);
    }
  };

  const roleColors: Record<string, string> = {
    owner: "bg-purple-100 text-purple-700",
    admin: "bg-blue-100 text-blue-700",
    manager: "bg-green-100 text-green-700",
    member: "bg-gray-100 text-gray-700",
    external: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">👥 チーム</h1>
          <p className="text-gray-500 text-sm mt-1">メンバーの管理と招待</p>
        </div>
        <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          メンバー追加
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map((m, i) => {
          const level = getLevelInfo(m.stats?.completed || 0);
          return (
            <motion.div
              key={m.uid}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="w-14 h-14">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-bold">
                      {m.displayName?.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-800">{m.displayName}</h3>
                      <Badge className={roleColors[m.role] || ""}>{MEMBER_ROLE_LABELS[m.role]}</Badge>
                    </div>
                    <p className="text-sm text-gray-400">{m.jobTitle}</p>
                    <p className="text-xs text-gray-300 mt-1">
                      {level.emoji} {level.title} ・ {m.stats?.completed || 0}キャッチ
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>メンバーを追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>お名前</Label>
              <Input
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="田中太郎"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>メールアドレス</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tanaka@example.com"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>初期パスワード</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="6文字以上"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>役割</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as MemberRole })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MEMBER_ROLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>職種</Label>
              <Select value={form.jobTitle} onValueChange={(v) => setForm({ ...form, jobTitle: v })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOB_TITLES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full h-11 bg-blue-500 hover:bg-blue-600"
              disabled={!form.displayName || !form.email || !form.password || loading}
              onClick={handleAdd}
            >
              {loading ? "追加中..." : "追加する"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
