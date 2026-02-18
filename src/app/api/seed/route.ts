import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

function hoursAgo(hours: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() - hours * 60 * 60 * 1000));
}

function minutesAgo(minutes: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() - minutes * 60 * 1000));
}

function daysAgo(days: number): Timestamp {
  return hoursAgo(days * 24);
}

// Default pipeline templates
const DEFAULT_PIPELINES = [
  {
    name: "戸建て新築",
    type: "new_build",
    stages: [
      { id: "s1", name: "問い合わせ対応", order: 1, defaultAssigneeRole: "営業", estimatedDays: 1, description: "" },
      { id: "s2", name: "現地調査", order: 2, defaultAssigneeRole: "営業", estimatedDays: 3, description: "" },
      { id: "s3", name: "ヒアリング・打合せ", order: 3, defaultAssigneeRole: "営業", estimatedDays: 7, description: "" },
      { id: "s4", name: "概算見積り", order: 4, defaultAssigneeRole: "営業", estimatedDays: 5, description: "" },
      { id: "s5", name: "プラン提案", order: 5, defaultAssigneeRole: "設計", estimatedDays: 14, description: "" },
      { id: "s6", name: "契約", order: 6, defaultAssigneeRole: "営業", estimatedDays: 3, description: "" },
      { id: "s7", name: "実施設計", order: 7, defaultAssigneeRole: "設計", estimatedDays: 30, description: "" },
      { id: "s8", name: "確認申請", order: 8, defaultAssigneeRole: "設計", estimatedDays: 21, description: "" },
      { id: "s9", name: "地鎮祭", order: 9, defaultAssigneeRole: "現場監督", estimatedDays: 1, description: "" },
      { id: "s10", name: "着工・基礎工事", order: 10, defaultAssigneeRole: "現場監督", estimatedDays: 30, description: "" },
      { id: "s11", name: "上棟", order: 11, defaultAssigneeRole: "大工", estimatedDays: 3, description: "" },
      { id: "s12", name: "屋根・外壁工事", order: 12, defaultAssigneeRole: "現場監督", estimatedDays: 30, description: "" },
      { id: "s13", name: "設備工事", order: 13, defaultAssigneeRole: "設備工事", estimatedDays: 14, description: "" },
      { id: "s14", name: "内装工事", order: 14, defaultAssigneeRole: "内装", estimatedDays: 21, description: "" },
      { id: "s15", name: "外構工事", order: 15, defaultAssigneeRole: "外構", estimatedDays: 14, description: "" },
      { id: "s16", name: "社内検査", order: 16, defaultAssigneeRole: "現場監督", estimatedDays: 2, description: "" },
      { id: "s17", name: "施主検査", order: 17, defaultAssigneeRole: "営業", estimatedDays: 3, description: "" },
      { id: "s18", name: "是正工事", order: 18, defaultAssigneeRole: "現場監督", estimatedDays: 7, description: "" },
      { id: "s19", name: "引渡し", order: 19, defaultAssigneeRole: "営業", estimatedDays: 1, description: "" },
      { id: "s20", name: "アフターフォロー", order: 20, defaultAssigneeRole: "営業", estimatedDays: 365, description: "" },
    ],
  },
  {
    name: "リフォーム",
    type: "renovation",
    stages: [
      { id: "r1", name: "問い合わせ対応", order: 1, defaultAssigneeRole: "営業", estimatedDays: 1, description: "" },
      { id: "r2", name: "現場調査", order: 2, defaultAssigneeRole: "営業", estimatedDays: 3, description: "" },
      { id: "r3", name: "ヒアリング", order: 3, defaultAssigneeRole: "営業", estimatedDays: 5, description: "" },
      { id: "r4", name: "プラン提案", order: 4, defaultAssigneeRole: "設計", estimatedDays: 10, description: "" },
      { id: "r5", name: "見積り", order: 5, defaultAssigneeRole: "営業", estimatedDays: 5, description: "" },
      { id: "r6", name: "契約", order: 6, defaultAssigneeRole: "営業", estimatedDays: 3, description: "" },
      { id: "r7", name: "工程表作成", order: 7, defaultAssigneeRole: "現場監督", estimatedDays: 3, description: "" },
      { id: "r8", name: "近隣挨拶", order: 8, defaultAssigneeRole: "現場監督", estimatedDays: 2, description: "" },
      { id: "r9", name: "着工", order: 9, defaultAssigneeRole: "現場監督", estimatedDays: 1, description: "" },
      { id: "r10", name: "施工", order: 10, defaultAssigneeRole: "大工", estimatedDays: 30, description: "" },
      { id: "r11", name: "完了検査", order: 11, defaultAssigneeRole: "現場監督", estimatedDays: 2, description: "" },
      { id: "r12", name: "引渡し", order: 12, defaultAssigneeRole: "営業", estimatedDays: 1, description: "" },
    ],
  },
  {
    name: "外壁塗装",
    type: "painting",
    stages: [
      { id: "p1", name: "問い合わせ", order: 1, defaultAssigneeRole: "営業", estimatedDays: 1, description: "" },
      { id: "p2", name: "現場調査", order: 2, defaultAssigneeRole: "営業", estimatedDays: 3, description: "" },
      { id: "p3", name: "見積り", order: 3, defaultAssigneeRole: "営業", estimatedDays: 3, description: "" },
      { id: "p4", name: "契約", order: 4, defaultAssigneeRole: "営業", estimatedDays: 2, description: "" },
      { id: "p5", name: "近隣挨拶", order: 5, defaultAssigneeRole: "現場監督", estimatedDays: 2, description: "" },
      { id: "p6", name: "足場組立", order: 6, defaultAssigneeRole: "現場監督", estimatedDays: 1, description: "" },
      { id: "p7", name: "高圧洗浄", order: 7, defaultAssigneeRole: "塗装", estimatedDays: 1, description: "" },
      { id: "p8", name: "養生", order: 8, defaultAssigneeRole: "塗装", estimatedDays: 1, description: "" },
      { id: "p9", name: "下地補修", order: 9, defaultAssigneeRole: "塗装", estimatedDays: 2, description: "" },
      { id: "p10", name: "下塗り", order: 10, defaultAssigneeRole: "塗装", estimatedDays: 1, description: "" },
      { id: "p11", name: "中塗り", order: 11, defaultAssigneeRole: "塗装", estimatedDays: 1, description: "" },
      { id: "p12", name: "上塗り", order: 12, defaultAssigneeRole: "塗装", estimatedDays: 1, description: "" },
      { id: "p13", name: "検査", order: 13, defaultAssigneeRole: "現場監督", estimatedDays: 1, description: "" },
      { id: "p14", name: "足場解体", order: 14, defaultAssigneeRole: "現場監督", estimatedDays: 1, description: "" },
      { id: "p15", name: "引渡し", order: 15, defaultAssigneeRole: "営業", estimatedDays: 1, description: "" },
    ],
  },
];

export async function POST(req: NextRequest) {
  try {
    const { companyId, userId, userName } = await req.json();

    if (!companyId || !userId || !userName) {
      return NextResponse.json(
        { error: "companyId, userId, and userName are required" },
        { status: 400 }
      );
    }

    // ============ Fetch or create pipelines ============
    const pipelinesSnap = await adminDb
      .collection("companies").doc(companyId).collection("pipelines").get();

    let pipelines = pipelinesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const pipelinesRef = adminDb.collection("companies").doc(companyId).collection("pipelines");
    for (const tmpl of DEFAULT_PIPELINES) {
      const existing = pipelines.find((p: any) => p.type === tmpl.type);
      if (!existing) {
        const docRef = await pipelinesRef.add({ ...tmpl, createdAt: Timestamp.now() });
        pipelines.push({ id: docRef.id, ...tmpl });
      }
    }

    const newBuildPipeline = pipelines.find((p: any) => p.type === "new_build")!;
    const renovationPipeline = pipelines.find((p: any) => p.type === "renovation")!;
    const paintingPipeline = pipelines.find((p: any) => p.type === "painting")!;

    const newBuildStages = (newBuildPipeline as any).stages || [];
    const renovationStages = (renovationPipeline as any).stages || [];
    const paintingStages = (paintingPipeline as any).stages || [];

    let membersCreated = 0;
    let projectsCreated = 0;
    let ballsCreated = 0;
    let messagesCreated = 0;

    // ============ Create Members (7 people) ============
    const demoMembers = [
      { uid: "demo-sato", displayName: "佐藤花子", email: "sato@demo.com", role: "admin", jobTitle: "営業", stats: { completed: 45, streak: 12, level: 2 } },
      { uid: "demo-tanaka", displayName: "田中健二", email: "tanaka@demo.com", role: "manager", jobTitle: "現場監督", stats: { completed: 120, streak: 30, level: 3 } },
      { uid: "demo-suzuki", displayName: "鈴木大介", email: "suzuki@demo.com", role: "member", jobTitle: "大工", stats: { completed: 200, streak: 5, level: 4 } },
      { uid: "demo-yamada", displayName: "山田太郎", email: "yamada@demo.com", role: "member", jobTitle: "設計", stats: { completed: 88, streak: 8, level: 2 } },
      { uid: "demo-ito", displayName: "伊藤美咲", email: "ito@demo.com", role: "member", jobTitle: "事務", stats: { completed: 60, streak: 15, level: 2 } },
      { uid: "demo-takahashi", displayName: "高橋工務", email: "takahashi@demo.com", role: "external", jobTitle: "塗装", stats: { completed: 15, streak: 0, level: 1 } },
      { uid: "demo-watanabe", displayName: "渡辺電工", email: "watanabe@demo.com", role: "external", jobTitle: "電気工事", stats: { completed: 32, streak: 3, level: 1 } },
    ];

    const membersRef = adminDb.collection("companies").doc(companyId).collection("members");

    // Update owner stats
    await membersRef.doc(userId).update({ stats: { completed: 78, streak: 7, level: 2 } }).catch(() => {});

    for (const m of demoMembers) {
      await membersRef.doc(m.uid).set(m);
      membersCreated++;
    }

    const nameMap: Record<string, string> = {
      [userId]: userName,
      "demo-sato": "佐藤花子",
      "demo-tanaka": "田中健二",
      "demo-suzuki": "鈴木大介",
      "demo-yamada": "山田太郎",
      "demo-ito": "伊藤美咲",
      "demo-takahashi": "高橋工務",
      "demo-watanabe": "渡辺電工",
    };

    function findStage(stages: any[], stageId: string) {
      return stages.find((s: any) => s.id === stageId);
    }

    async function addBall(projRef: any, data: any) {
      await projRef.collection("balls").add(data);
      ballsCreated++;
    }

    async function addMsg(projRef: any, data: any) {
      await projRef.collection("messages").add(data);
      messagesCreated++;
    }

    const projBase = adminDb.collection("companies").doc(companyId).collection("projects");

    // ======================================================
    // Project 1: 田中邸 新築工事 (active, stage 11/20)
    // ======================================================
    const p1Ref = await projBase.add({
      name: "田中邸 新築工事",
      clientName: "田中様",
      clientPhone: "090-1234-5678",
      address: "東京都世田谷区代沢1-2-3",
      type: "new_build",
      pipelineId: newBuildPipeline.id,
      status: "active",
      currentStageIndex: 10,
      assignees: [userId, "demo-sato", "demo-tanaka", "demo-suzuki", "demo-yamada"],
      startDate: daysAgo(90),
      expectedEndDate: hoursAgo(-60 * 24),
      createdAt: daysAgo(100),
      customerShareToken: crypto.randomUUID().slice(0, 8),
    });
    projectsCreated++;
    const p1 = adminDb.collection("companies").doc(companyId).collection("projects").doc(p1Ref.id);

    // Completed balls (s1-s9)
    const p1CompletedHolders = [userId, userId, userId, "demo-sato", "demo-yamada", userId, "demo-yamada", "demo-yamada", "demo-tanaka"];
    for (let i = 0; i < 9; i++) {
      const stage = findStage(newBuildStages, `s${i + 1}`);
      if (!stage) continue;
      const hid = p1CompletedHolders[i];
      await addBall(p1, {
        title: stage.name, stageId: `s${i + 1}`, stageOrder: stage.order,
        holderId: hid, holderName: nameMap[hid],
        thrownBy: i < 3 ? "demo-sato" : userId, thrownByName: i < 3 ? "佐藤花子" : userName,
        status: "completed", priority: "normal",
        holdingSince: daysAgo(90 - i * 8), completedAt: daysAgo(85 - i * 8),
        requiresApproval: false, isInterruption: false, createdAt: daysAgo(90 - i * 8),
      });
    }

    // Active balls
    // s10 基礎コンクリート打設 → 田中健二 (hot, 30h)
    await addBall(p1, {
      title: "基礎コンクリート打設", stageId: "s10", stageOrder: 10,
      holderId: "demo-tanaka", holderName: "田中健二",
      thrownBy: userId, thrownByName: userName,
      status: "holding", priority: "normal", holdingSince: hoursAgo(30),
      requiresApproval: false, isInterruption: false, createdAt: hoursAgo(30),
    });

    // s10 配筋検査報告 → 自分 (warm, 10h)
    await addBall(p1, {
      title: "配筋検査報告", stageId: "s10", stageOrder: 10,
      holderId: userId, holderName: userName,
      thrownBy: "demo-tanaka", thrownByName: "田中健二",
      status: "holding", priority: "normal", holdingSince: hoursAgo(10),
      requiresApproval: false, isInterruption: false, createdAt: hoursAgo(10),
    });

    // s11 構造材発注 → 自分 (cool, 2h, urgent)
    await addBall(p1, {
      title: "構造材発注", stageId: "s11", stageOrder: 11,
      holderId: userId, holderName: userName,
      thrownBy: "demo-tanaka", thrownByName: "田中健二",
      status: "holding", priority: "urgent", holdingSince: hoursAgo(2),
      requiresApproval: false, isInterruption: false, createdAt: hoursAgo(2),
    });

    // s11 上棟式手配 → 佐藤花子 (burning! 50h)
    await addBall(p1, {
      title: "上棟式手配", stageId: "s11", stageOrder: 11,
      holderId: "demo-sato", holderName: "佐藤花子",
      thrownBy: userId, thrownByName: userName,
      status: "holding", priority: "normal", holdingSince: hoursAgo(50),
      requiresApproval: false, isInterruption: false, createdAt: hoursAgo(50),
    });

    // s12 外壁材サンプル確認 → 山田 (warm, 18h)
    await addBall(p1, {
      title: "外壁材サンプル確認", stageId: "s12", stageOrder: 12,
      holderId: "demo-yamada", holderName: "山田太郎",
      thrownBy: userId, thrownByName: userName,
      status: "holding", priority: "normal", holdingSince: hoursAgo(18),
      requiresApproval: false, isInterruption: false, createdAt: hoursAgo(18),
    });

    // Interruption: 追加見積り → 自分 (urgent)
    await addBall(p1, {
      title: "追加見積り（お客様要望）", stageOrder: 999,
      holderId: userId, holderName: userName,
      thrownBy: "demo-sato", thrownByName: "佐藤花子",
      status: "holding", priority: "urgent", holdingSince: hoursAgo(8),
      requiresApproval: false, isInterruption: true, createdAt: hoursAgo(8),
    });

    // Interruption: 近隣クレーム対応 → 田中 (hot, 26h)
    await addBall(p1, {
      title: "近隣クレーム対応", stageOrder: 999,
      holderId: "demo-tanaka", holderName: "田中健二",
      thrownBy: userId, thrownByName: userName,
      status: "holding", priority: "urgent", holdingSince: hoursAgo(26),
      requiresApproval: false, isInterruption: true, createdAt: hoursAgo(26),
    });

    // Messages
    await addMsg(p1, { senderId: "demo-tanaka", senderName: "田中健二", text: "基礎の養生期間について確認お願いします", createdAt: hoursAgo(12) });
    await addMsg(p1, { senderId: userId, senderName: userName, text: "了解です。明日現場確認に行きます。", createdAt: hoursAgo(11) });
    await addMsg(p1, { senderId: "demo-tanaka", senderName: "田中健二", text: "配筋検査の写真共有します", createdAt: hoursAgo(6) });
    await addMsg(p1, { senderId: "demo-yamada", senderName: "山田太郎", text: "外壁の色、お客様から白系で最終確定いただきました", createdAt: hoursAgo(4) });
    await addMsg(p1, { senderId: "demo-sato", senderName: "佐藤花子", text: "お客様から追加要望入りました。ウッドデッキ追加希望とのこと", createdAt: hoursAgo(3) });
    await addMsg(p1, { senderId: userId, senderName: userName, text: "見積り作成します。週末までには出せます。", createdAt: hoursAgo(2) });
    await addMsg(p1, { senderId: "demo-suzuki", senderName: "鈴木大介", text: "木材の納期、来週火曜日で確定しました", createdAt: hoursAgo(1) });
    await addMsg(p1, { senderId: "demo-tanaka", senderName: "田中健二", text: "了解！上棟日程調整します", createdAt: minutesAgo(30) });

    // ======================================================
    // Project 2: 佐藤邸 リフォーム工事 (active, stage 7/12)
    // ======================================================
    const p2Ref = await projBase.add({
      name: "佐藤邸 キッチンリフォーム",
      clientName: "佐藤様",
      clientPhone: "080-9876-5432",
      address: "東京都目黒区自由が丘2-5-8",
      type: "renovation",
      pipelineId: renovationPipeline.id,
      status: "active",
      currentStageIndex: 6,
      assignees: [userId, "demo-sato", "demo-tanaka", "demo-suzuki", "demo-watanabe"],
      startDate: daysAgo(40),
      expectedEndDate: hoursAgo(-30 * 24),
      createdAt: daysAgo(45),
      customerShareToken: crypto.randomUUID().slice(0, 8),
    });
    projectsCreated++;
    const p2 = adminDb.collection("companies").doc(companyId).collection("projects").doc(p2Ref.id);

    // Completed r1-r6
    const p2CompletedHolders = [userId, userId, "demo-sato", "demo-yamada", "demo-sato", userId];
    for (let i = 0; i < 6; i++) {
      const stage = findStage(renovationStages, `r${i + 1}`);
      if (!stage) continue;
      const hid = p2CompletedHolders[i];
      await addBall(p2, {
        title: stage.name, stageId: `r${i + 1}`, stageOrder: stage.order,
        holderId: hid, holderName: nameMap[hid],
        thrownBy: userId, thrownByName: userName,
        status: "completed", priority: "normal",
        holdingSince: daysAgo(40 - i * 5), completedAt: daysAgo(38 - i * 5),
        requiresApproval: false, isInterruption: false, createdAt: daysAgo(40 - i * 5),
      });
    }

    // r7 工程表作成 → 田中 (cool, 3h)
    await addBall(p2, {
      title: "工程表作成", stageId: "r7", stageOrder: 7,
      holderId: "demo-tanaka", holderName: "田中健二",
      thrownBy: userId, thrownByName: userName,
      status: "holding", priority: "normal", holdingSince: hoursAgo(3),
      requiresApproval: false, isInterruption: false, createdAt: hoursAgo(3),
    });

    // キッチン設備発注 → 自分 (warm, 15h)
    await addBall(p2, {
      title: "キッチン設備発注", stageId: "r7", stageOrder: 7,
      holderId: userId, holderName: userName,
      thrownBy: "demo-sato", thrownByName: "佐藤花子",
      status: "holding", priority: "normal", holdingSince: hoursAgo(15),
      requiresApproval: false, isInterruption: false, createdAt: hoursAgo(15),
    });

    // 電気配線確認 → 渡辺電工 (warm, 20h)
    await addBall(p2, {
      title: "電気配線確認", stageId: "r7", stageOrder: 7,
      holderId: "demo-watanabe", holderName: "渡辺電工",
      thrownBy: "demo-tanaka", thrownByName: "田中健二",
      status: "holding", priority: "normal", holdingSince: hoursAgo(20),
      requiresApproval: false, isInterruption: false, createdAt: hoursAgo(20),
    });

    // 見積書確認 → 佐藤 (waiting, 12h)
    await addBall(p2, {
      title: "見積書最終確認", stageId: "r5", stageOrder: 5,
      holderId: "demo-sato", holderName: "佐藤花子",
      thrownBy: userId, thrownByName: userName,
      status: "waiting", priority: "normal", holdingSince: hoursAgo(12),
      requiresApproval: true, isInterruption: false, createdAt: hoursAgo(12),
    });

    // Messages
    await addMsg(p2, { senderId: "demo-sato", senderName: "佐藤花子", text: "キッチンのショールーム予約取れました。今週土曜日14時です", createdAt: daysAgo(2) });
    await addMsg(p2, { senderId: userId, senderName: userName, text: "ありがとうございます。お客様に連絡しておきます", createdAt: daysAgo(2) });
    await addMsg(p2, { senderId: "demo-watanabe", senderName: "渡辺電工", text: "キッチン周りの電気容量、200Vに変更した方がいいかもしれません", createdAt: hoursAgo(5) });
    await addMsg(p2, { senderId: "demo-tanaka", senderName: "田中健二", text: "IHにするなら200V必須ですね。確認しましょう", createdAt: hoursAgo(4) });
    await addMsg(p2, { senderId: userId, senderName: userName, text: "お客様にIH希望か確認中です", createdAt: hoursAgo(2) });

    // ======================================================
    // Project 3: 中村邸 新築工事 (active, stage 5/20, 初期段階)
    // ======================================================
    const p3Ref = await projBase.add({
      name: "中村邸 新築工事",
      clientName: "中村様",
      clientPhone: "070-5555-1234",
      address: "東京都練馬区石神井台4-8-12",
      type: "new_build",
      pipelineId: newBuildPipeline.id,
      status: "active",
      currentStageIndex: 4,
      assignees: [userId, "demo-sato", "demo-yamada"],
      startDate: daysAgo(20),
      createdAt: daysAgo(25),
      customerShareToken: crypto.randomUUID().slice(0, 8),
    });
    projectsCreated++;
    const p3 = adminDb.collection("companies").doc(companyId).collection("projects").doc(p3Ref.id);

    // Completed s1-s4
    for (let i = 0; i < 4; i++) {
      const stage = findStage(newBuildStages, `s${i + 1}`);
      if (!stage) continue;
      const holders = [userId, userId, "demo-sato", userId];
      const hid = holders[i];
      await addBall(p3, {
        title: stage.name, stageId: `s${i + 1}`, stageOrder: stage.order,
        holderId: hid, holderName: nameMap[hid],
        thrownBy: userId, thrownByName: userName,
        status: "completed", priority: "normal",
        holdingSince: daysAgo(20 - i * 4), completedAt: daysAgo(18 - i * 4),
        requiresApproval: false, isInterruption: false, createdAt: daysAgo(20 - i * 4),
      });
    }

    // s5 プラン提案 → 山田 (cool, 1h)
    await addBall(p3, {
      title: "プラン提案", stageId: "s5", stageOrder: 5,
      holderId: "demo-yamada", holderName: "山田太郎",
      thrownBy: userId, thrownByName: userName,
      status: "holding", priority: "normal", holdingSince: hoursAgo(1),
      requiresApproval: false, isInterruption: false, createdAt: hoursAgo(1),
    });

    // s5 間取りプラン修正 → 自分 (hot, 36h)
    await addBall(p3, {
      title: "間取りプラン修正（2回目）", stageId: "s5", stageOrder: 5,
      holderId: userId, holderName: userName,
      thrownBy: "demo-yamada", thrownByName: "山田太郎",
      status: "holding", priority: "normal", holdingSince: hoursAgo(36),
      requiresApproval: false, isInterruption: false, createdAt: hoursAgo(36),
    });

    // 土地の境界確認 → 佐藤 (warm, 16h)
    await addBall(p3, {
      title: "土地の境界確認", stageId: "s5", stageOrder: 5,
      holderId: "demo-sato", holderName: "佐藤花子",
      thrownBy: userId, thrownByName: userName,
      status: "holding", priority: "normal", holdingSince: hoursAgo(16),
      requiresApproval: false, isInterruption: false, createdAt: hoursAgo(16),
    });

    // Messages
    await addMsg(p3, { senderId: "demo-yamada", senderName: "山田太郎", text: "中村様のご要望を反映したプラン案できました。LDK20畳で作成しています", createdAt: daysAgo(1) });
    await addMsg(p3, { senderId: userId, senderName: userName, text: "ありがとうございます。リビング階段は外してほしいとのことです。修正お願いします", createdAt: hoursAgo(20) });
    await addMsg(p3, { senderId: "demo-yamada", senderName: "山田太郎", text: "了解です。ボックス階段に変更します。3Dパースも更新しますね", createdAt: hoursAgo(18) });

    // ======================================================
    // Project 4: 鈴木邸 外壁塗装 (active, stage 8/15, 施工中)
    // ======================================================
    const p4Ref = await projBase.add({
      name: "鈴木邸 外壁塗装",
      clientName: "鈴木様",
      clientPhone: "090-3333-7777",
      address: "東京都杉並区荻窪3-7-1",
      type: "painting",
      pipelineId: paintingPipeline.id,
      status: "active",
      currentStageIndex: 7,
      assignees: [userId, "demo-tanaka", "demo-takahashi"],
      startDate: daysAgo(10),
      expectedEndDate: hoursAgo(-5 * 24),
      createdAt: daysAgo(30),
      customerShareToken: crypto.randomUUID().slice(0, 8),
    });
    projectsCreated++;
    const p4 = adminDb.collection("companies").doc(companyId).collection("projects").doc(p4Ref.id);

    // Completed p1-p7
    const p4Holders = [userId, userId, userId, userId, "demo-tanaka", "demo-tanaka", "demo-takahashi"];
    for (let i = 0; i < 7; i++) {
      const stage = findStage(paintingStages, `p${i + 1}`);
      if (!stage) continue;
      const hid = p4Holders[i];
      await addBall(p4, {
        title: stage.name, stageId: `p${i + 1}`, stageOrder: stage.order,
        holderId: hid, holderName: nameMap[hid],
        thrownBy: userId, thrownByName: userName,
        status: "completed", priority: "normal",
        holdingSince: daysAgo(28 - i * 3), completedAt: daysAgo(26 - i * 3),
        requiresApproval: false, isInterruption: false, createdAt: daysAgo(28 - i * 3),
      });
    }

    // p8 養生 → 高橋 (cool, 2h)
    await addBall(p4, {
      title: "養生", stageId: "p8", stageOrder: 8,
      holderId: "demo-takahashi", holderName: "高橋工務",
      thrownBy: "demo-tanaka", thrownByName: "田中健二",
      status: "holding", priority: "normal", holdingSince: hoursAgo(2),
      requiresApproval: false, isInterruption: false, createdAt: hoursAgo(2),
    });

    // p9 下地補修 → 高橋 (cool, 1h)
    await addBall(p4, {
      title: "下地補修", stageId: "p9", stageOrder: 9,
      holderId: "demo-takahashi", holderName: "高橋工務",
      thrownBy: "demo-tanaka", thrownByName: "田中健二",
      status: "holding", priority: "normal", holdingSince: hoursAgo(1),
      requiresApproval: false, isInterruption: false, createdAt: hoursAgo(1),
    });

    // 塗料カラー最終確認 → 自分 (cool, 3h)
    await addBall(p4, {
      title: "塗料カラー最終確認", stageId: "p9", stageOrder: 9,
      holderId: userId, holderName: userName,
      thrownBy: "demo-takahashi", thrownByName: "高橋工務",
      status: "holding", priority: "normal", holdingSince: hoursAgo(3),
      requiresApproval: false, isInterruption: false, createdAt: hoursAgo(3),
    });

    // Messages
    await addMsg(p4, { senderId: "demo-takahashi", senderName: "高橋工務", text: "外壁にクラック数カ所見つかりました。補修してから塗装に入ります", createdAt: daysAgo(1) });
    await addMsg(p4, { senderId: "demo-tanaka", senderName: "田中健二", text: "写真撮っておいてください。お客様に報告します", createdAt: hoursAgo(20) });
    await addMsg(p4, { senderId: "demo-takahashi", senderName: "高橋工務", text: "了解です。写真撮りました。クラック補修剤の追加発注が必要です", createdAt: hoursAgo(8) });
    await addMsg(p4, { senderId: userId, senderName: userName, text: "クラック補修の追加費用は当社負担で対応しましょう", createdAt: hoursAgo(5) });

    // ======================================================
    // Project 5: 渡辺邸 リフォーム (planning, 見積段階)
    // ======================================================
    const p5Ref = await projBase.add({
      name: "渡辺邸 バスルームリフォーム",
      clientName: "渡辺様",
      clientPhone: "080-1111-2222",
      address: "東京都板橋区成増5-3-9",
      type: "renovation",
      pipelineId: renovationPipeline.id,
      status: "planning",
      currentStageIndex: 2,
      assignees: [userId, "demo-sato", "demo-ito"],
      createdAt: daysAgo(5),
      customerShareToken: crypto.randomUUID().slice(0, 8),
    });
    projectsCreated++;
    const p5 = adminDb.collection("companies").doc(companyId).collection("projects").doc(p5Ref.id);

    // Completed r1-r2
    await addBall(p5, {
      title: "問い合わせ対応", stageId: "r1", stageOrder: 1,
      holderId: "demo-ito", holderName: "伊藤美咲",
      thrownBy: userId, thrownByName: userName,
      status: "completed", priority: "normal",
      holdingSince: daysAgo(5), completedAt: daysAgo(4),
      requiresApproval: false, isInterruption: false, createdAt: daysAgo(5),
    });
    await addBall(p5, {
      title: "現場調査", stageId: "r2", stageOrder: 2,
      holderId: userId, holderName: userName,
      thrownBy: "demo-ito", thrownByName: "伊藤美咲",
      status: "completed", priority: "normal",
      holdingSince: daysAgo(3), completedAt: daysAgo(2),
      requiresApproval: false, isInterruption: false, createdAt: daysAgo(3),
    });

    // r3 ヒアリング → 佐藤 (cool, 5h)
    await addBall(p5, {
      title: "ヒアリング", stageId: "r3", stageOrder: 3,
      holderId: "demo-sato", holderName: "佐藤花子",
      thrownBy: userId, thrownByName: userName,
      status: "holding", priority: "normal", holdingSince: hoursAgo(5),
      requiresApproval: false, isInterruption: false, createdAt: hoursAgo(5),
    });

    // 概算見積書作成 → 自分 (cool, 1h)
    await addBall(p5, {
      title: "概算見積書作成", stageId: "r3", stageOrder: 3,
      holderId: userId, holderName: userName,
      thrownBy: "demo-ito", thrownByName: "伊藤美咲",
      status: "holding", priority: "normal", holdingSince: hoursAgo(1),
      requiresApproval: false, isInterruption: false, createdAt: hoursAgo(1),
    });

    // 請求書処理 → 伊藤 (warm, 22h)
    await addBall(p5, {
      title: "前回分の請求書処理", stageOrder: 999,
      holderId: "demo-ito", holderName: "伊藤美咲",
      thrownBy: userId, thrownByName: userName,
      status: "holding", priority: "normal", holdingSince: hoursAgo(22),
      requiresApproval: false, isInterruption: true, createdAt: hoursAgo(22),
    });

    // Messages
    await addMsg(p5, { senderId: "demo-ito", senderName: "伊藤美咲", text: "渡辺様からお問い合わせ入りました。バスルームのリフォーム希望です", createdAt: daysAgo(5) });
    await addMsg(p5, { senderId: userId, senderName: userName, text: "ありがとう。現場調査行ってきます", createdAt: daysAgo(4) });
    await addMsg(p5, { senderId: userId, senderName: userName, text: "現調完了。ユニットバス入替＋洗面所改装の2パターンで提案します", createdAt: daysAgo(2) });

    // ======================================================
    // Project 6: 山本邸 新築 (completed)
    // ======================================================
    await projBase.add({
      name: "山本邸 新築工事",
      clientName: "山本様",
      address: "東京都町田市鶴川1-15-3",
      type: "new_build",
      pipelineId: newBuildPipeline.id,
      status: "completed",
      currentStageIndex: 19,
      assignees: [userId, "demo-sato", "demo-tanaka", "demo-suzuki"],
      startDate: daysAgo(300),
      expectedEndDate: daysAgo(30),
      createdAt: daysAgo(320),
      customerShareToken: crypto.randomUUID().slice(0, 8),
    });
    projectsCreated++;

    return NextResponse.json({
      success: true,
      created: {
        members: membersCreated,
        projects: projectsCreated,
        balls: ballsCreated,
        messages: messagesCreated,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed demo data" },
      { status: 500 }
    );
  }
}
