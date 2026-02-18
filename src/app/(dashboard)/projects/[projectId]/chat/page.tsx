"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { onMessagesChange, createMessage } from "@/lib/firestore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project, Message } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { ArrowLeft, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function ProjectChatPage() {
  const params = useParams();
  const router = useRouter();
  const { companyId, user, member } = useAuth();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!companyId || !projectId) return;
    async function load() {
      const projDoc = await getDoc(doc(db, "companies", companyId!, "projects", projectId));
      if (projDoc.exists()) setProject({ id: projDoc.id, ...projDoc.data() } as Project);
    }
    load();
    const unsub = onMessagesChange(companyId, projectId, setMessages);
    return unsub;
  }, [companyId, projectId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !companyId || !user) return;
    await createMessage(companyId, projectId, {
      senderId: user.uid,
      senderName: member?.displayName || user.displayName || "匿名",
      text: text.trim(),
    });
    setText("");
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/projects/${projectId}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold text-gray-800">
          💬 {project?.name || "チャット"}
        </h1>
      </div>

      <Card className="flex-1 border-0 shadow-sm flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isMe = msg.senderId === user?.uid;
            const time = msg.createdAt?.toDate?.() ? format(msg.createdAt.toDate(), "HH:mm", { locale: ja }) : "";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-2", isMe && "flex-row-reverse")}
              >
                {!isMe && (
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                      {msg.senderName?.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("max-w-[70%]", isMe && "text-right")}>
                  {!isMe && <p className="text-xs text-gray-400 mb-1">{msg.senderName}</p>}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2 inline-block text-sm",
                      isMe
                        ? "bg-teal-500 text-white rounded-br-none"
                        : "bg-gray-100 text-gray-800 rounded-bl-none"
                    )}
                  >
                    {msg.text}
                  </div>
                  <p className="text-[10px] text-gray-300 mt-1">{time}</p>
                </div>
              </motion.div>
            );
          })}
          <div ref={endRef} />
        </CardContent>
        <div className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="メッセージを入力..."
              className="h-11"
            />
            <Button onClick={handleSend} disabled={!text.trim()} className="h-11 bg-teal-500 hover:bg-teal-600">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
