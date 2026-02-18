"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createCompany, DEFAULT_PIPELINES, createPipeline } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp, setCurrentCompany } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await signUp(email, password, displayName);
      const companyId = await createCompany(companyName, user.uid, displayName, email);
      for (const pipeline of DEFAULT_PIPELINES) {
        await createPipeline(companyId, pipeline);
      }
      setCurrentCompany(companyId);
      toast.success("登録完了！さあ始めましょう！");
      router.push("/dashboard");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        toast.error("このメールアドレスは既に使われています。");
      } else {
        toast.error("登録に失敗しました。もう一度お試しください。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <Card className="shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="text-5xl mb-2">⚾</div>
          <CardTitle className="text-2xl">はじめまして！</CardTitle>
          <CardDescription>アカウントと会社情報を登録してキャッチボールを始めよう</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">お名前</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="山田 太郎"
                required
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">会社名（工務店名）</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="株式会社〇〇建設"
                required
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@company.com"
                required
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上"
                required
                minLength={6}
                className="h-12 text-base"
              />
            </div>
            <p className="text-xs text-gray-400">
              登録すると新築・リフォーム・外壁塗装のパイプラインが自動作成されます。
            </p>
            <Button
              type="submit"
              className="w-full h-12 text-base bg-teal-500 hover:bg-teal-600"
              disabled={loading}
            >
              {loading ? "登録中..." : "キャッチボールを始める ⚾"}
            </Button>
          </form>
          <p className="text-center mt-6 text-sm text-gray-500">
            アカウントをお持ちの方は{" "}
            <Link href="/login" className="text-blue-500 hover:underline font-medium">
              ログイン
            </Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
