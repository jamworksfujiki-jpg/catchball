"use client";

import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getLevelInfo, MEMBER_ROLE_LABELS } from "@/types";
import { Building2, User, Shield, Award } from "lucide-react";

export default function SettingsPage() {
  const { user, member, company } = useAuth();
  const level = getLevelInfo(member?.stats?.completed || 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">⚙️ 設定</h1>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            アカウント情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">お名前</span>
            <span className="font-medium">{member?.displayName || user?.displayName}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">メールアドレス</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">職種</span>
            <span className="font-medium">{member?.jobTitle || "未設定"}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">役割</span>
            <Badge variant="secondary">{MEMBER_ROLE_LABELS[member?.role || "member"]}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            会社情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">会社名</span>
            <span className="font-medium">{company?.name || "未設定"}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">プラン</span>
            <Badge variant="secondary">{company?.plan === "pro" ? "Pro" : "Free"}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4" />
            実績
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">レベル</span>
            <span className="font-medium">{level.emoji} {level.title}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">累計キャッチ数</span>
            <span className="font-medium">{member?.stats?.completed || 0}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">連続日数</span>
            <span className="font-medium">{member?.stats?.streak || 0}日</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
