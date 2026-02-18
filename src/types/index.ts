import { Timestamp } from "firebase/firestore";

// ============ Company ============
export interface Company {
  id: string;
  name: string;
  plan: "free" | "pro";
  createdAt: Timestamp;
  ownerUid: string;
}

// ============ Member ============
export type MemberRole = "owner" | "admin" | "manager" | "member" | "external";

export interface Member {
  uid: string;
  displayName: string;
  email: string;
  role: MemberRole;
  jobTitle: string;
  lineUserId?: string;
  avatarUrl?: string;
  stats: {
    completed: number;
    streak: number;
    level: number;
  };
}

// ============ Pipeline ============
export type ProjectType = "new_build" | "renovation" | "painting" | "custom";

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  defaultAssigneeRole: string;
  estimatedDays: number;
  description: string;
}

export interface Pipeline {
  id: string;
  name: string;
  type: ProjectType;
  stages: PipelineStage[];
  createdAt: Timestamp;
}

// ============ Project ============
export type ProjectStatus = "planning" | "active" | "completed" | "cancelled";

export interface Project {
  id: string;
  name: string;
  clientName: string;
  clientPhone?: string;
  address?: string;
  type: ProjectType;
  pipelineId: string;
  status: ProjectStatus;
  currentStageIndex: number;
  assignees: string[];
  startDate?: Timestamp;
  expectedEndDate?: Timestamp;
  createdAt: Timestamp;
  customerShareToken?: string;
}

// ============ Ball (Task) ============
export type BallStatus = "holding" | "waiting" | "approved" | "rejected" | "completed";
export type BallPriority = "normal" | "urgent";

export interface Ball {
  id: string;
  title: string;
  description?: string;
  stageId?: string;
  stageOrder: number;
  holderId: string;
  holderName?: string;
  thrownBy: string;
  thrownByName?: string;
  status: BallStatus;
  priority: BallPriority;
  dueDate?: Timestamp;
  holdingSince: Timestamp;
  requiresApproval: boolean;
  approvers?: string[];
  isInterruption: boolean;
  completedAt?: Timestamp;
  createdAt: Timestamp;
}

// ============ Message ============
export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  ballId?: string;
  createdAt: Timestamp;
}

// ============ Ball Temperature ============
export type BallTemperature = "cool" | "warm" | "hot" | "burning";

export function getBallTemperature(holdingSince: Date): BallTemperature {
  const hours = (Date.now() - holdingSince.getTime()) / (1000 * 60 * 60);
  if (hours < 4) return "cool";
  if (hours < 24) return "warm";
  if (hours < 48) return "hot";
  return "burning";
}

export const BALL_TEMP_CONFIG: Record<BallTemperature, { color: string; bg: string; label: string; emoji: string }> = {
  cool: { color: "text-blue-600", bg: "bg-blue-100", label: "余裕あり", emoji: "🔵" },
  warm: { color: "text-yellow-600", bg: "bg-yellow-100", label: "そろそろ", emoji: "🟡" },
  hot: { color: "text-orange-600", bg: "bg-orange-100", label: "急いで", emoji: "🟠" },
  burning: { color: "text-red-600", bg: "bg-red-100", label: "炎上中！", emoji: "🔴" },
};

// ============ Level System ============
export const LEVELS = [
  { level: 1, title: "見習い", minPoints: 0, emoji: "🌱" },
  { level: 2, title: "一人前", minPoints: 100, emoji: "⭐" },
  { level: 3, title: "棟梁", minPoints: 500, emoji: "🏗️" },
  { level: 4, title: "親方", minPoints: 1500, emoji: "👑" },
  { level: 5, title: "匠", minPoints: 5000, emoji: "🏆" },
] as const;

export function getLevelInfo(points: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) return LEVELS[i];
  }
  return LEVELS[0];
}

// ============ Project Type Labels ============
export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  new_build: "新築",
  renovation: "リフォーム",
  painting: "外壁塗装",
  custom: "その他",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "計画中",
  active: "施工中",
  completed: "完了",
  cancelled: "中止",
};

export const BALL_STATUS_LABELS: Record<BallStatus, string> = {
  holding: "保持中",
  waiting: "確認待ち",
  approved: "承認済み",
  rejected: "差し戻し",
  completed: "完了",
};

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner: "オーナー",
  admin: "管理者",
  manager: "マネージャー",
  member: "メンバー",
  external: "外注",
};

export const JOB_TITLES = [
  "営業",
  "設計",
  "現場監督",
  "大工",
  "電気工事",
  "設備工事",
  "塗装",
  "内装",
  "外構",
  "事務",
  "社長",
] as const;
