import { NextRequest, NextResponse } from "next/server";
import { saveDiagnosisResult } from "../utils/store"; // payload全体を保存するようにしてね

export async function POST(request: NextRequest) {
  try {
    // リクエストヘッダーをログに出力
    console.log(
      "Webhookリクエストヘッダー:",
      JSON.stringify(Object.fromEntries(request.headers), null, 2)
    );
    // WebhookからのJSONボディを取得
    const payload = await request.json();
    console.log("SORACOM Fluxからのwebhookを受信:", payload);

    // ペイロード全体をそのまま保存
    saveDiagnosisResult(payload);

    console.log("診断データを保存しました");

    // 成功レスポンス
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhookエラー:", error);
    return NextResponse.json(
      { message: "Webhookの処理に失敗しました" },
      { status: 500 }
    );
  }
}
