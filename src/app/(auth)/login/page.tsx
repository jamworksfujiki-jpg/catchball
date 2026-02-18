"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success("ログインしました！");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error("ログインに失敗しました。メールアドレスとパスワードを確認してください。");
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
          <CardTitle className="text-2xl">おかえりなさい！</CardTitle>
          <CardDescription>キャッチボールにログイン</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="パスワードを入力"
                required
                className="h-12 text-base"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base bg-blue-500 hover:bg-blue-600"
              disabled={loading}
            >
              {loading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
          <p className="text-center mt-6 text-sm text-gray-500">
            アカウントをお持ちでない方は{" "}
            <Link href="/register" className="text-blue-500 hover:underline font-medium">
              新規登録
            </Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
