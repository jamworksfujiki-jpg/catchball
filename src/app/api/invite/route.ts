import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const { companyId, companyName, inviterName, invites } = await req.json();

    if (!companyId || !invites?.length) {
      return NextResponse.json({ error: "companyId and invites are required" }, { status: 400 });
    }

    const baseUrl = req.headers.get("origin") || "https://catchball-eta.vercel.app";
    const results = [];

    for (const invite of invites) {
      const { email, name, role, jobTitle } = invite;
      if (!email) continue;

      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

      await adminDb
        .collection("companies")
        .doc(companyId)
        .collection("invitations")
        .add({
          email,
          name: name || "",
          role: role || "member",
          jobTitle: jobTitle || "",
          token,
          createdBy: inviterName || "",
          createdAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
          used: false,
        });

      const link = `${baseUrl}/accept-invitation/${token}`;
      let emailSent = false;

      // Send email via Resend if configured
      if (process.env.RESEND_API_KEY) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "キャッチボール <onboarding@resend.dev>",
              to: email,
              subject: `${inviterName || "チームメンバー"}さんからキャッチボールへの招待`,
              html: `
                <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 48px;">⚾</span>
                  </div>
                  <h2 style="color: #1B1B27; text-align: center; margin-bottom: 8px;">キャッチボールへの招待</h2>
                  <p style="color: #6b7280; text-align: center; margin-bottom: 24px;">
                    <strong>${inviterName || "チームメンバー"}</strong>さんが<br/>
                    あなたを<strong>${companyName || "チーム"}</strong>に招待しています
                  </p>
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${link}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px;">
                      招待を受ける
                    </a>
                  </div>
                  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                    このリンクは7日間有効です。<br/>
                    心当たりがない場合はこのメールを無視してください。
                  </p>
                </div>
              `,
            }),
          });
          emailSent = res.ok;
        } catch {
          // Email failed, link is still available
        }
      }

      results.push({ email, name, token, link, emailSent });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json({ error: "Failed to send invitations" }, { status: 500 });
  }
}
