// LINE Messaging API helpers

export async function sendLineBallNotification(
  lineUserId: string,
  ballTitle: string,
  projectName: string,
  senderName: string,
  companyId: string,
  projectId: string,
  ballId: string,
  requiresApproval: boolean
) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !lineUserId) return;

  const actions: any[] = [];
  if (requiresApproval) {
    actions.push(
      {
        type: "postback",
        label: "承認する",
        data: `action=approve&companyId=${companyId}&projectId=${projectId}&ballId=${ballId}`,
        displayText: "承認しました",
      },
      {
        type: "postback",
        label: "却下する",
        data: `action=reject&companyId=${companyId}&projectId=${projectId}&ballId=${ballId}`,
        displayText: "却下しました",
      }
    );
  }

  const flexMessage = {
    type: "flex",
    altText: `【${projectName}】${ballTitle}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "⚾ 新しいボールが届きました",
            weight: "bold",
            size: "sm",
            color: "#3B82F6",
          },
        ],
        backgroundColor: "#EFF6FF",
        paddingAll: "15px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: projectName,
            weight: "bold",
            size: "md",
            color: "#1F2937",
          },
          {
            type: "text",
            text: ballTitle,
            size: "lg",
            weight: "bold",
            color: "#111827",
            margin: "md",
          },
          {
            type: "text",
            text: `${senderName}さんからのボールです`,
            size: "sm",
            color: "#6B7280",
            margin: "md",
          },
        ],
        paddingAll: "15px",
      },
      ...(actions.length > 0
        ? {
            footer: {
              type: "box",
              layout: "horizontal",
              spacing: "sm",
              contents: actions.map((action, i) => ({
                type: "button",
                style: i === 0 ? "primary" : "secondary",
                color: i === 0 ? "#10B981" : undefined,
                action,
              })),
              paddingAll: "15px",
            },
          }
        : {}),
    },
  };

  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [flexMessage],
    }),
  });
}
