import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { Company, Member, Pipeline, Project, Ball, Message, PipelineStage } from "@/types";

// ============ Company ============
export async function createCompany(name: string, ownerUid: string, ownerName: string, ownerEmail: string) {
  const companyRef = await addDoc(collection(db, "companies"), {
    name,
    plan: "free",
    createdAt: serverTimestamp(),
    ownerUid,
  });
  await setDoc(doc(db, "companies", companyRef.id, "members", ownerUid), {
    uid: ownerUid,
    displayName: ownerName,
    email: ownerEmail,
    role: "owner",
    jobTitle: "社長",
    stats: { completed: 0, streak: 0, level: 1 },
  } satisfies Member);
  return companyRef.id;
}

// ============ Members ============
export async function getMembers(companyId: string) {
  const snap = await getDocs(collection(db, "companies", companyId, "members"));
  return snap.docs.map((d) => d.data() as Member);
}

export async function addMember(companyId: string, member: Member) {
  await setDoc(doc(db, "companies", companyId, "members", member.uid), member);
}

export function onMembersChange(companyId: string, callback: (members: Member[]) => void) {
  return onSnapshot(collection(db, "companies", companyId, "members"), (snap) => {
    callback(snap.docs.map((d) => d.data() as Member));
  });
}

// ============ Pipelines ============
export async function createPipeline(companyId: string, pipeline: Omit<Pipeline, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, "companies", companyId, "pipelines"), {
    ...pipeline,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getPipelines(companyId: string) {
  const snap = await getDocs(collection(db, "companies", companyId, "pipelines"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Pipeline);
}

export async function updatePipeline(companyId: string, pipelineId: string, data: Partial<Pipeline>) {
  await updateDoc(doc(db, "companies", companyId, "pipelines", pipelineId), data);
}

export async function deletePipeline(companyId: string, pipelineId: string) {
  await deleteDoc(doc(db, "companies", companyId, "pipelines", pipelineId));
}

export function onPipelinesChange(companyId: string, callback: (pipelines: Pipeline[]) => void) {
  return onSnapshot(collection(db, "companies", companyId, "pipelines"), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Pipeline));
  });
}

// ============ Projects ============
export async function createProject(companyId: string, project: Omit<Project, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, "companies", companyId, "projects"), {
    ...project,
    createdAt: serverTimestamp(),
    customerShareToken: crypto.randomUUID().slice(0, 8),
  });
  return ref.id;
}

export async function getProjects(companyId: string) {
  const snap = await getDocs(
    query(collection(db, "companies", companyId, "projects"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Project);
}

export async function updateProject(companyId: string, projectId: string, data: Partial<Project>) {
  await updateDoc(doc(db, "companies", companyId, "projects", projectId), data);
}

export function onProjectsChange(companyId: string, callback: (projects: Project[]) => void) {
  return onSnapshot(
    query(collection(db, "companies", companyId, "projects"), orderBy("createdAt", "desc")),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Project));
    }
  );
}

// ============ Balls ============
export async function createBall(companyId: string, projectId: string, ball: Omit<Ball, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, "companies", companyId, "projects", projectId, "balls"), {
    ...ball,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getBalls(companyId: string, projectId: string) {
  const snap = await getDocs(
    query(
      collection(db, "companies", companyId, "projects", projectId, "balls"),
      orderBy("stageOrder", "asc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ball);
}

export async function updateBall(companyId: string, projectId: string, ballId: string, data: Partial<Ball>) {
  await updateDoc(doc(db, "companies", companyId, "projects", projectId, "balls", ballId), data);
}

export async function deleteBall(companyId: string, projectId: string, ballId: string) {
  await deleteDoc(doc(db, "companies", companyId, "projects", projectId, "balls", ballId));
}

export function onBallsChange(
  companyId: string,
  projectId: string,
  callback: (balls: Ball[]) => void
) {
  return onSnapshot(
    query(
      collection(db, "companies", companyId, "projects", projectId, "balls"),
      orderBy("stageOrder", "asc")
    ),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ball));
    }
  );
}

// ============ Messages ============
export async function createMessage(companyId: string, projectId: string, message: Omit<Message, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, "companies", companyId, "projects", projectId, "messages"), {
    ...message,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function onMessagesChange(
  companyId: string,
  projectId: string,
  callback: (messages: Message[]) => void
) {
  return onSnapshot(
    query(
      collection(db, "companies", companyId, "projects", projectId, "messages"),
      orderBy("createdAt", "asc")
    ),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message));
    }
  );
}

// ============ Default Pipeline Templates ============
export const DEFAULT_PIPELINES: Omit<Pipeline, "id" | "createdAt">[] = [
  {
    name: "戸建て新築",
    type: "new_build",
    stages: [
      { id: "s1", name: "問い合わせ対応", order: 1, defaultAssigneeRole: "営業", estimatedDays: 1, description: "初回の問い合わせに対応" },
      { id: "s2", name: "現地調査", order: 2, defaultAssigneeRole: "営業", estimatedDays: 3, description: "現地の確認・測量" },
      { id: "s3", name: "ヒアリング・打合せ", order: 3, defaultAssigneeRole: "営業", estimatedDays: 7, description: "お客様のご要望をヒアリング" },
      { id: "s4", name: "概算見積り", order: 4, defaultAssigneeRole: "営業", estimatedDays: 5, description: "概算見積書の作成" },
      { id: "s5", name: "プラン提案", order: 5, defaultAssigneeRole: "設計", estimatedDays: 14, description: "設計プランの作成・提案" },
      { id: "s6", name: "契約", order: 6, defaultAssigneeRole: "営業", estimatedDays: 3, description: "契約書類の準備・締結" },
      { id: "s7", name: "実施設計", order: 7, defaultAssigneeRole: "設計", estimatedDays: 30, description: "詳細な設計図面の作成" },
      { id: "s8", name: "確認申請", order: 8, defaultAssigneeRole: "設計", estimatedDays: 21, description: "建築確認申請の提出" },
      { id: "s9", name: "地鎮祭", order: 9, defaultAssigneeRole: "現場監督", estimatedDays: 1, description: "地鎮祭の手配・実施" },
      { id: "s10", name: "着工・基礎工事", order: 10, defaultAssigneeRole: "現場監督", estimatedDays: 30, description: "基礎工事の施工" },
      { id: "s11", name: "上棟", order: 11, defaultAssigneeRole: "大工", estimatedDays: 3, description: "建て方・上棟式" },
      { id: "s12", name: "屋根・外壁工事", order: 12, defaultAssigneeRole: "現場監督", estimatedDays: 30, description: "屋根・外壁の施工" },
      { id: "s13", name: "設備工事", order: 13, defaultAssigneeRole: "設備工事", estimatedDays: 14, description: "電気・給排水・空調" },
      { id: "s14", name: "内装工事", order: 14, defaultAssigneeRole: "内装", estimatedDays: 21, description: "内装仕上げ" },
      { id: "s15", name: "外構工事", order: 15, defaultAssigneeRole: "外構", estimatedDays: 14, description: "外構・エクステリア" },
      { id: "s16", name: "社内検査", order: 16, defaultAssigneeRole: "現場監督", estimatedDays: 2, description: "社内完了検査" },
      { id: "s17", name: "施主検査", order: 17, defaultAssigneeRole: "営業", estimatedDays: 3, description: "お客様立ち会い検査" },
      { id: "s18", name: "是正工事", order: 18, defaultAssigneeRole: "現場監督", estimatedDays: 7, description: "指摘事項の修正" },
      { id: "s19", name: "引渡し", order: 19, defaultAssigneeRole: "営業", estimatedDays: 1, description: "鍵引渡し・取扱説明" },
      { id: "s20", name: "アフターフォロー", order: 20, defaultAssigneeRole: "営業", estimatedDays: 365, description: "定期点検・アフターサービス" },
    ],
  },
  {
    name: "リフォーム",
    type: "renovation",
    stages: [
      { id: "r1", name: "問い合わせ対応", order: 1, defaultAssigneeRole: "営業", estimatedDays: 1, description: "初回の問い合わせに対応" },
      { id: "r2", name: "現場調査", order: 2, defaultAssigneeRole: "営業", estimatedDays: 3, description: "現状確認・採寸" },
      { id: "r3", name: "ヒアリング", order: 3, defaultAssigneeRole: "営業", estimatedDays: 5, description: "ご要望のヒアリング" },
      { id: "r4", name: "プラン提案", order: 4, defaultAssigneeRole: "設計", estimatedDays: 10, description: "リフォームプランの提案" },
      { id: "r5", name: "見積り", order: 5, defaultAssigneeRole: "営業", estimatedDays: 5, description: "見積書の作成" },
      { id: "r6", name: "契約", order: 6, defaultAssigneeRole: "営業", estimatedDays: 3, description: "契約の締結" },
      { id: "r7", name: "工程表作成", order: 7, defaultAssigneeRole: "現場監督", estimatedDays: 3, description: "施工スケジュールの作成" },
      { id: "r8", name: "近隣挨拶", order: 8, defaultAssigneeRole: "現場監督", estimatedDays: 2, description: "近隣住民へのご挨拶" },
      { id: "r9", name: "着工", order: 9, defaultAssigneeRole: "現場監督", estimatedDays: 1, description: "工事開始" },
      { id: "r10", name: "施工", order: 10, defaultAssigneeRole: "大工", estimatedDays: 30, description: "各種工事の施工" },
      { id: "r11", name: "完了検査", order: 11, defaultAssigneeRole: "現場監督", estimatedDays: 2, description: "完了検査の実施" },
      { id: "r12", name: "引渡し", order: 12, defaultAssigneeRole: "営業", estimatedDays: 1, description: "お客様への引渡し" },
    ],
  },
  {
    name: "外壁塗装",
    type: "painting",
    stages: [
      { id: "p1", name: "問い合わせ", order: 1, defaultAssigneeRole: "営業", estimatedDays: 1, description: "問い合わせ対応" },
      { id: "p2", name: "現場調査（劣化診断）", order: 2, defaultAssigneeRole: "営業", estimatedDays: 3, description: "外壁の劣化状態を診断" },
      { id: "p3", name: "見積り", order: 3, defaultAssigneeRole: "営業", estimatedDays: 3, description: "見積書の作成" },
      { id: "p4", name: "契約", order: 4, defaultAssigneeRole: "営業", estimatedDays: 2, description: "契約の締結" },
      { id: "p5", name: "近隣挨拶", order: 5, defaultAssigneeRole: "現場監督", estimatedDays: 2, description: "近隣住民へのご挨拶" },
      { id: "p6", name: "足場組立", order: 6, defaultAssigneeRole: "現場監督", estimatedDays: 1, description: "足場の設置" },
      { id: "p7", name: "高圧洗浄", order: 7, defaultAssigneeRole: "塗装", estimatedDays: 1, description: "外壁の高圧洗浄" },
      { id: "p8", name: "養生", order: 8, defaultAssigneeRole: "塗装", estimatedDays: 1, description: "養生テープ・シートの設置" },
      { id: "p9", name: "下地補修", order: 9, defaultAssigneeRole: "塗装", estimatedDays: 2, description: "クラック補修・コーキング" },
      { id: "p10", name: "下塗り", order: 10, defaultAssigneeRole: "塗装", estimatedDays: 1, description: "下塗り作業" },
      { id: "p11", name: "中塗り", order: 11, defaultAssigneeRole: "塗装", estimatedDays: 1, description: "中塗り作業" },
      { id: "p12", name: "上塗り", order: 12, defaultAssigneeRole: "塗装", estimatedDays: 1, description: "上塗り（仕上げ）作業" },
      { id: "p13", name: "検査", order: 13, defaultAssigneeRole: "現場監督", estimatedDays: 1, description: "仕上がり検査" },
      { id: "p14", name: "足場解体", order: 14, defaultAssigneeRole: "現場監督", estimatedDays: 1, description: "足場の撤去" },
      { id: "p15", name: "引渡し", order: 15, defaultAssigneeRole: "営業", estimatedDays: 1, description: "お客様への引渡し" },
    ],
  },
];
