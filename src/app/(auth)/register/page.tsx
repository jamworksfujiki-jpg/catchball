"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createCompany } from "@/lib/firestore";
import { DEFAULT_PIPELINES } from "@/lib/firestore";
import { createPipeline } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function RegisterPage() {
  const [step, setStep] = useState<"account" | "company">("account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const { signUp, setCurrentCompany } = useAuth();
  const router = useRouter();

  const handleAccountCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await signUp(email, password, displayName);
      setUserId(user.uid);
      setStep("company");
      toast.success("アカウントを作成しました！");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        toast.error("このメールアドレスは既に使われています。");
      } else {
        toast.error("アカウント作成に失敗しました。");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const companyId = await createCompany(companyName, userId, displayName, email);
      // Create default pipeline templates
      for (const pipeline of DEFAULT_PIPELINES) {
        await createPipeline(companyId, pipeline);
      }
      setCurrentCompany(companyId);
      toast.success("会社を登録しました！さあ始めましょう！");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error("会社の登録に失敗しました。");
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
          <CardTitle className="text-2xl">
            {step === "account" ? "はじめまして！" : "会社を登録しよう"}
          </CardTitle>
          <CardDescription>
            {step === "account"
              ? "アカウントを作成してキャッチボールを始めよう"
              : "あなたの工務店情報を登録します"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "account" ? (
            <form onSubmit={handleAccountCreate} className="space-y-4">
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
              <Button
                type="submit"
                className="w-full h-12 text-base bg-blue-500 hover:bg-blue-600"
                disabled={loading}
              >
                {loading ? "作成中..." : "次へ"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCompanyCreate} className="space-y-4">
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
              <p className="text-sm text-gray-500">
                登録すると、新築・リフォーム・外壁塗装のパイプラインテンプレートが自動で作成されます。
              </p>
              <Button
                type="submit"
                className="w-full h-12 text-base bg-blue-500 hover:bg-blue-600"
                disabled={loading}
              >
                {loading ? "登録中..." : "キャッチボールを始める ⚾"}
              </Button>
            </form>
          )}
          {step === "account" && (
            <p className="text-center mt-6 text-sm text-gray-500">
              アカウントをお持ちの方は{" "}
              <Link href="/login" className="text-blue-500 hover:underline font-medium">
                ログイン
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
