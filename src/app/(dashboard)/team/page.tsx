"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { onMembersChange, createInvitation } from "@/lib/firestore";
import { Member, MEMBER_ROLE_LABELS, JOB_TITLES, MemberRole } from "@/types";
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
import { Mail, Link2, Copy, Check, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function TeamPage() {
  const { companyId, company, member, user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState<"email" | "link">("email");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("member");
  const [inviteJobTitle, setInviteJobTitle] = useState("営業");
  const [generatedLink, setGeneratedLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    return onMembersChange(companyId, setMembers);
  }, [companyId]);

  const handleSendEmail = async () => {
    if (!companyId || !user || !inviteEmail.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          companyName: company?.name || "",
          inviterName: member?.displayName || "",
          invites: [{
            email: inviteEmail.trim(),
            name: inviteName.trim(),
            role: inviteRole,
            jobTitle: inviteJobTitle,
          }],
        }),
      });
      const data = await res.json();
      if (data.success && data.results?.[0]) {
        const result = data.results[0];
        setGeneratedLink(result.link);
        if (result.emailSent) {
          setEmailSent(true);
          toast.success(`${inviteEmail}に招待メールを送信しました！`);
        } else {
          toast.success("招待リンクを作成しました（メール送信は未設定）");
        }
      }
    } catch {
      toast.error("招待の送信に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!companyId || !user) return;
    setLoading(true);
    try {
      const token = await createInvitation(companyId, {
        role: inviteRole,
        jobTitle: inviteJobTitle,
        createdBy: user.uid,
      });
      const link = `${window.location.origin}/accept-invitation/${token}`;
      setGeneratedLink(link);
      toast.success("招待リンクを発行しました！");
    } catch {
      toast.error("招待リンクの発行に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success("リンクをコピーしました！");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("コピーに失敗しました。");
    }
  };

  const handleDialogOpen = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setGeneratedLink("");
      setCopied(false);
      setEmailSent(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("member");
      setInviteJobTitle("営業");
      setInviteMode("email");
    }
  };

  const roleColors: Record<string, string> = {
    owner: "bg-purple-100 text-purple-700",
    admin: "bg-teal-100 text-teal-700",
    manager: "bg-green-100 text-green-700",
    member: "bg-gray-100 text-gray-700",
    external: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B1B27]">チーム</h1>
          <p className="text-gray-400 text-sm mt-1">メンバーの管理と招待</p>
        </div>
        <Button className="bg-teal-500 hover:bg-teal-600" onClick={() => handleDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          メンバーを招待
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map((m, i) => (
          <motion.div
            key={m.uid}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="w-14 h-14">
                  <AvatarFallback className="bg-teal-100 text-teal-600 text-lg font-bold">
                    {m.displayName?.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-[#1B1B27]">{m.displayName}</h3>
                    <Badge className={roleColors[m.role] || ""}>{MEMBER_ROLE_LABELS[m.role]}</Badge>
                  </div>
                  <p className="text-sm text-gray-400">{m.jobTitle}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>メンバーを招待</DialogTitle>
          </DialogHeader>

          {/* Mode tabs */}
          {!generatedLink && (
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setInviteMode("email")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all ${
                  inviteMode === "email"
                    ? "bg-white text-[#1B1B27] shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                メールで招待
              </button>
              <button
                onClick={() => setInviteMode("link")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all ${
                  inviteMode === "link"
                    ? "bg-white text-[#1B1B27] shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                リンクで招待
              </button>
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* Email mode fields */}
            {inviteMode === "email" && !generatedLink && (
              <>
                <div className="space-y-2">
                  <Label>名前</Label>
                  <Input
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="山田 太郎"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>メールアドレス</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="example@company.com"
                    className="h-11"
                    required
                  />
                </div>
              </>
            )}

            {/* Common fields */}
            {!generatedLink && (
              <>
                <div className="space-y-2">
                  <Label>役割</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as MemberRole)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MEMBER_ROLE_LABELS)
                        .filter(([k]) => k !== "owner")
                        .map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>職種</Label>
                  <Select value={inviteJobTitle} onValueChange={setInviteJobTitle}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_TITLES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {inviteMode === "email" ? (
                  <Button
                    className="w-full h-11 bg-teal-500 hover:bg-teal-600"
                    disabled={loading || !inviteEmail.trim()}
                    onClick={handleSendEmail}
                  >
                    {loading ? "送信中..." : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        招待メールを送信
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full h-11 bg-teal-500 hover:bg-teal-600"
                    disabled={loading}
                    onClick={handleGenerateLink}
                  >
                    {loading ? "発行中..." : (
                      <>
                        <Link2 className="w-4 h-4 mr-2" />
                        招待リンクを発行
                      </>
                    )}
                  </Button>
                )}
              </>
            )}

            {/* Result */}
            {generatedLink && (
              <div className="space-y-3">
                {emailSent && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                    <p className="text-sm text-emerald-700 font-medium">
                      {inviteEmail}に招待メールを送信しました
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">招待リンク（7日間有効）</p>
                  <div className="bg-gray-50 rounded-lg p-3 break-all text-sm text-gray-600 border">
                    {generatedLink}
                  </div>
                </div>
                <Button className="w-full h-11 bg-gray-800 hover:bg-gray-900" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      コピーしました！
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      リンクをコピー
                    </>
                  )}
                </Button>
                <Button variant="outline" className="w-full h-11" onClick={() => handleDialogOpen(false)}>
                  閉じる
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
