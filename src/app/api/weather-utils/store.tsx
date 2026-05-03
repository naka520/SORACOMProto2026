// src/app/api/utils/store.ts
// 診断結果を保存するためのグローバルストア

// 診断結果の型定義
export interface DiagnosisResult {
  output: {
    shindan: string;
    recommend: string;
  };
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    model: string;
    model_id: string;
    byol: boolean;
    service: string;
    credit: number;
  };
}

// 診断結果を保存するための変数
let diagnosisResult: DiagnosisResult | null = null;

// 診断結果を保存する関数
export function saveWeatherDiagnosisResult(payload: DiagnosisResult): void {
  console.log("診断結果を保存:", payload);
  diagnosisResult = payload;
}

// 診断結果を取得する関数
export function getWeatherDiagnosisResult(): DiagnosisResult | null {
  console.log("診断結果を取得:", diagnosisResult);
  return diagnosisResult;
}
