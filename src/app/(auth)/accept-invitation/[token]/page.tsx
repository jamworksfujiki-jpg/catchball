"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getInvitationByToken, consumeInvitation, addMember } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const { signUp, setCurrentCompany } = useAuth();
  const router = useRouter();
  const [invitation, setInvitation] = useState<any>(null);
  const [loadingInv, setLoadingInv] = useState(true);
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const inv = await getInvitationByToken(token);
        if (!inv) {
          setError("招待リンクが無効です。");
        } else if (inv.used) {
          setError("この招待リンクは既に使用されています。");
        } else if (inv.expiresAt?.toDate && inv.expiresAt.toDate() < new Date()) {
          setError("この招待リンクは期限切れです。");
        } else {
          setInvitation(inv);
        }
      } catch {
        setError("招待情報の取得に失敗しました。");
      }
      setLoadingInv(false);
    }
    load();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;
    setLoading(true);
    try {
      const user = await signUp(email, password, displayName);
      await addMember(invitation.companyId, {
        uid: user.uid,
        displayName,
        email,
        role: invitation.role || "member",
        jobTitle: invitation.jobTitle || "",
        stats: { completed: 0, streak: 0, level: 1 },
      });
      await consumeInvitation(invitation.companyId, invitation.id);
      setCurrentCompany(invitation.companyId);
      toast.success(`${invitation.companyName}に参加しました！`);
      router.push("/dashboard");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        toast.error("このメールアドレスは既に使われています。ログインしてください。");
      } else {
        toast.error("登録に失敗しました。");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingInv) {
    return (
      <div className="w-full max-w-md text-center py-20">
        <div className="text-4xl mb-4">⚾</div>
        <p className="text-gray-500">招待情報を確認中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 text-center">
          <CardContent className="py-12">
            <div className="text-5xl mb-4">😢</div>
            <p className="text-gray-600 text-lg">{error}</p>
            <Button className="mt-6" onClick={() => router.push("/login")}>
              ログインページへ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
      <Card className="shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="text-5xl mb-2">⚾</div>
          <CardTitle className="text-xl">チームに参加しよう！</CardTitle>
          <CardDescription>
            <span className="font-bold text-blue-500">{invitation.companyName}</span> に招待されています
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm text-center">
            <span className="text-gray-500">役割: </span>
            <span className="font-bold text-gray-700">{invitation.jobTitle || invitation.role}</span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">お名前</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="山田 太郎" required className="h-12 text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@company.com" required className="h-12 text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6文字以上" required minLength={6} className="h-12 text-base" />
            </div>
            <Button type="submit" className="w-full h-12 text-base bg-teal-500 hover:bg-teal-600" disabled={loading}>
              {loading ? "登録中..." : "参加する ⚾"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
