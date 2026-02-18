"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <header className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-3xl">⚾</span>
          <span className="text-2xl font-bold text-gray-800">キャッチボール</span>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => router.push("/login")}>
            ログイン
          </Button>
          <Button onClick={() => router.push("/register")} className="bg-blue-500 hover:bg-blue-600">
            無料で始める
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="text-8xl mb-8"
          >
            ⚾
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl font-bold text-gray-800 mb-6 leading-tight"
          >
            仕事のボール、<br />
            <span className="text-blue-500">ちゃんと届いてる？</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            建築業の進捗管理を、キャッチボールのように。<br />
            誰がボールを持っているか一目でわかるから、<br />
            仕事がスムーズに前に進みます。
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Button
              size="lg"
              onClick={() => router.push("/register")}
              className="bg-blue-500 hover:bg-blue-600 text-lg px-10 py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
            >
              無料で始める
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="grid md:grid-cols-3 gap-8 mt-32"
        >
          {[
            {
              emoji: "🏐",
              title: "ボールで見える化",
              desc: "今誰がボールを持っているかが一目瞭然。タスクの滞留もすぐわかります。",
            },
            {
              emoji: "🏗️",
              title: "建築に特化",
              desc: "新築・リフォーム・外壁塗装。工事の種類に合わせたパイプラインを簡単設定。",
            },
            {
              emoji: "📱",
              title: "LINEで簡単",
              desc: "外注さんはLINEでボールを受け取り、承認・却下もLINE上でOK。",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-all"
            >
              <div className="text-5xl mb-4">{feature.emoji}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      <footer className="bg-gray-50 py-8 text-center text-gray-500 text-sm">
        <p>&copy; 2026 キャッチボール</p>
      </footer>
    </div>
  );
}
