import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import crypto from "crypto";

function verifySignature(body: string, signature: string): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) return false;
  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

async function sendLineMessage(userId: string, messages: any[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to: userId, messages }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-line-signature") || "";

    // Verify signature if secret is configured
    if (process.env.LINE_CHANNEL_SECRET && !verifySignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const data = JSON.parse(body);
    const events = data.events || [];

    for (const event of events) {
      if (event.type === "postback") {
        const params = new URLSearchParams(event.postback.data);
        const action = params.get("action");
        const companyId = params.get("companyId");
        const projectId = params.get("projectId");
        const ballId = params.get("ballId");

        if (!companyId || !projectId || !ballId) continue;

        const ballRef = adminDb
          .collection("companies")
          .doc(companyId)
          .collection("projects")
          .doc(projectId)
          .collection("balls")
          .doc(ballId);

        if (action === "approve") {
          await ballRef.update({
            status: "approved",
          });
          // Reply
          await sendLineMessage(event.source.userId, [
            { type: "text", text: "承認しました！次のステップに進みます。" },
          ]);
        } else if (action === "reject") {
          await ballRef.update({
            status: "rejected",
          });
          await sendLineMessage(event.source.userId, [
            { type: "text", text: "却下しました。担当者に差し戻します。" },
          ]);
        }
      }

      // Handle follow event (friend add)
      if (event.type === "follow") {
        await sendLineMessage(event.source.userId, [
          {
            type: "text",
            text: "キャッチボールへようこそ！⚾\nこのアカウントから工事の承認依頼などが届きます。",
          },
        ]);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("LINE Webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// LINE sends GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
