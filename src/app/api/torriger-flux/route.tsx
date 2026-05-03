import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // リクエストボディをそのまま取得
    const body = await request.json();

    // SORACOM Flux Incoming WebhookにそのままPOST
    const webhookUrl = process.env.SORACOM_FLUX_WEBHOOK_URL!;
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("SORACOM Flux呼び出しエラー:", errorData);
      return NextResponse.json(
        { message: "SORACOM Fluxへの送信に失敗しました" },
        { status: 500 }
      );
    }

    // 成功レスポンス
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("トリガーエラー:", error);
    return NextResponse.json(
      { message: "診断の開始に失敗しました" },
      { status: 500 }
    );
  }
}
