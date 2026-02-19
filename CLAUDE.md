# キャッチボール - 建築業向けプロジェクト管理SaaS

## 概要
建築現場のタスク管理を「キャッチボール」のメタファーで可視化するWebアプリ。
ボール = タスク。投げる = 依頼する。受け取る = 対応する。温度が上がる = 放置されている。

**本番URL**: https://catchball-eta.vercel.app
**GitHub**: https://github.com/jamworksfujiki-jpg/catchball

## 技術スタック
- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript
- **UI**: Tailwind CSS 4 + shadcn/ui + Framer Motion + Lucide icons
- **Backend**: Firebase Auth + Cloud Firestore + Firebase Admin SDK
- **外部連携**: LINE Messaging API（外注先への通知）
- **デプロイ**: Vercel（Serverless Functions）
- **Drag & Drop**: dnd-kit

## コマンド
```bash
npm install          # 依存関係インストール
npm run dev          # ローカル開発 (http://localhost:3000)
npm run build        # 本番ビルド
npx vercel --prod --force  # Vercelデプロイ
node test-e2e.mjs    # E2Eテスト実行
```

## ディレクトリ構造
```
src/
├── app/
│   ├── page.tsx                    # LP（ランディングページ）
│   ├── layout.tsx                  # ルートレイアウト（AuthProvider, Toaster）
│   ├── (auth)/                     # 認証ページ群
│   │   ├── login/                  # ログイン
│   │   ├── register/               # 新規登録（会社作成）
│   │   └── accept-invitation/[token]/ # 招待リンクからの参加
│   ├── (dashboard)/                # メインアプリ（要ログイン）
│   │   ├── dashboard/page.tsx      # ★ ホーム画面（キャッチボール状況）
│   │   ├── projects/               # 案件一覧・詳細・チャット・ボード
│   │   ├── balls/                  # あなたのボール（タスク一覧）
│   │   ├── pipelines/              # 工程テンプレート管理
│   │   ├── team/                   # チームメンバー・招待管理
│   │   ├── settings/               # 設定
│   │   └── contractor/             # 外注先ビュー
│   └── api/
│       ├── seed/route.ts           # デモデータ投入API
│       ├── invite/route.ts         # 招待メール送信API
│       └── line/webhook/route.ts   # LINE Webhook受信
├── components/
│   ├── layout/                     # Sidebar, Header, MobileNav
│   ├── ball/                       # BallCard, BallIcon
│   ├── celebration/                # Confetti（完了アニメーション）
│   ├── onboarding/                 # SetupWizard（初期セットアップ）
│   └── ui/                         # shadcn/uiコンポーネント群
├── lib/
│   ├── firebase.ts                 # Firebase Client SDK初期化
│   ├── firebase-admin.ts           # Firebase Admin SDK初期化（サーバー側）
│   ├── auth-context.tsx            # 認証コンテキスト（useAuth）
│   ├── firestore.ts                # Firestore CRUD操作（全エンティティ）
│   ├── line.ts                     # LINE通知送信
│   └── utils.ts                    # ユーティリティ（cn関数等）
└── types/
    └── index.ts                    # 全型定義（Company, Member, Ball, Project等）
```

## Firestoreデータモデル
```
companies/{companyId}
  ├── members/{uid}         # メンバー（role: owner/admin/manager/member/external）
  ├── invitations/{invId}   # 招待（7日有効期限、token認証）
  ├── pipelines/{pipelineId}# 工程テンプレート
  └── projects/{projectId}  # 案件
      ├── balls/{ballId}    # ボール（タスク）
      └── messages/{msgId}  # チャットメッセージ
```

## 主要な概念
- **ボール温度**: 保持時間で自動変化（cool→warm→hot→burning）
- **工程（Pipeline）**: 建築工程テンプレート（新築20段階、リフォーム12段階等）
- **左右相対UI**: ダッシュボードは「投げた人（左）→ ボール → 受け取る人（右）」で表示
- **デモデータ**: `/api/seed` で7名・6案件・40+ボールを自動生成

## 環境変数（.env.local）
```
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin（サーバー側）
FIREBASE_PRIVATE_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=

# LINE（任意）
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
```

## デザインルール
- **カラーパレット**: teal（メイン）+ グレー系（サブ）+ 赤/オレンジ（緊急のみ）
- **グラデーション不使用**: 全て単色
- **コンパクト**: アバター36px、ボール44px、余白最小限
- **アニメーション**: Framer Motionで控えめに（fade-in, scale）

## デプロイ手順
1. `npm run build` でビルド確認
2. `npx vercel --prod --force` でデプロイ
3. `node test-e2e.mjs` でE2Eテスト
4. 環境変数はVercelダッシュボードで設定済み
