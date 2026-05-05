// 天気連携診断の結果をメモリ上に保持するインメモリストア（プロトタイプ用）

export interface DiagnosisResult {
  output: {
    shindan: string;
    recommend: string;
    [key: string]: unknown;
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
  [key: string]: unknown;
}

let diagnosisResult: DiagnosisResult | null = null;

export function saveWeatherDiagnosisResult(payload: DiagnosisResult): void {
  console.log("天気診断結果を保存:", payload);
  diagnosisResult = payload;
}

export function getWeatherDiagnosisResult(): DiagnosisResult | null {
  return diagnosisResult;
}
