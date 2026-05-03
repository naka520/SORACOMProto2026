import { NextResponse } from "next/server";
import { getDiagnosisResult } from "../utils/store";

export async function GET() {
  // 診断結果を取得
  const result = getDiagnosisResult();

  // 診断結果が見つからない場合は404エラーを返す
  if (!result) {
    return NextResponse.json(
      { message: "結果が見つかりません" },
      { status: 404 }
    );
  }

  // 診断結果を返す
  return NextResponse.json(result);
}
