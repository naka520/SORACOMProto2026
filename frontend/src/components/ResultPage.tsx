import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { KoupenSVG } from "./KoupenSVG";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

interface DiagnosisResult {
  output?: Record<string, unknown>;
  usage?: Record<string, unknown>;
}

function readOutputText(
  output: Record<string, unknown> | undefined,
  keys: string[],
  fallback: string,
): string {
  if (!output) return fallback;
  for (const key of keys) {
    const value = output[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return fallback;
}

interface ResultPageProps {
  diagnosisEndpoint: string;
  maxRetries?: number;
  loadingNote?: string;
  footerNote?: string;
}

export function ResultPage({
  diagnosisEndpoint,
  maxRetries = 30,
  loadingNote = "GPSマルチユニットの温湿度と撮影画像を照合し、保管可否を評価しています。",
  footerNote = "設置前に環境条件を確認し、保管対象への負荷を抑制してください。",
}: ResultPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = searchParams.get("requestId")?.trim() ?? "";

  useEffect(() => {
    if (!requestId) {
      setError(
        "受付番号を確認できませんでした。再度撮影からやり直してください。",
      );
      setLoading(false);
      return;
    }

    let retries = 0;
    let cancelled = false;

    const fetchResult = async (): Promise<boolean> => {
      try {
        const res = await fetch(
          `${API_BASE}/api/${diagnosisEndpoint}?requestId=${encodeURIComponent(requestId)}`,
        );
        if (!res.ok) {
          if (res.status === 404) return false;
          throw new Error(`エラー: ${res.status}`);
        }
        const data = (await res.json()) as DiagnosisResult;
        if (data && Object.keys(data).length > 0) {
          setResult(data);
          setLoading(false);
          return true;
        }
      } catch (err) {
        console.error("結果取得エラー:", err);
        setError("診断結果の取得処理でエラーが発生しました。");
        setLoading(false);
        return true;
      }
      return false;
    };

    const poll = async () => {
      if (cancelled) return;
      const done = await fetchResult();
      if (!done) {
        retries += 1;
        if (retries > maxRetries) {
          setError("診断結果の取得が規定時間内に完了しませんでした。");
          setLoading(false);
          return;
        }
        setTimeout(poll, 2000);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [diagnosisEndpoint, maxRetries, requestId]);

  if (loading) {
    return (
      <div className="inspection-shell bg-gradient-to-b from-blue-100 to-white">
        <div className="inspection-panel">
          <div className="inspection-topbar">
            <span className="inspection-code">ANALYSIS REPORT</span>
            <span className="inspection-chip">processing</span>
          </div>
          <div className="inspection-body">
            <div className="inspection-hero">
              <div className="inspection-mascot">
                <KoupenSVG />
              </div>
              <div>
                <p className="inspection-kicker">Assessment Processing</p>
                <h1 className="inspection-title">診断処理を実行中です</h1>
                <p className="inspection-lead">
                  SORACOM Flux
                  上で環境診断を実行しています。結果反映までお待ちください。
                </p>
              </div>
            </div>
            <div className="inspection-divider" />
            <div className="inspection-card">
              <div className="inspection-status">analysis in progress</div>
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 inspection-spinner mb-4" />
                <p className="text-sm text-gray-500 mt-2 text-center">
                  {loadingNote}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="inspection-shell bg-gradient-to-b from-blue-100 to-white">
        <div className="inspection-panel">
          <div className="inspection-topbar">
            <span className="inspection-code">ANALYSIS REPORT</span>
            <span className="inspection-chip">error</span>
          </div>
          <div className="inspection-body">
            <div className="inspection-hero">
              <div className="inspection-mascot">
                <KoupenSVG />
              </div>
              <div>
                <p className="inspection-kicker">Processing Exception</p>
                <h1 className="inspection-title text-red-600">
                  結果取得に失敗しました
                </h1>
                <p className="inspection-lead">
                  {error ?? "診断結果を確認できませんでした"}
                </p>
              </div>
            </div>
            <div className="inspection-divider" />
            <div className="inspection-card">
              <button
                onClick={() => navigate("/")}
                className="inspection-button inspection-button-primary"
              >
                診断受付へ戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const placement = readOutputText(
    result.output,
    ["placement", "shindan", "judge", "summary"],
    "判定情報は記録されていません",
  );
  const advice = readOutputText(
    result.output,
    ["advice", "recommend", "countermeasure"],
    "対策情報は記録されていません",
  );
  const forecastNote = readOutputText(
    result.output,
    ["forecastNote", "weather", "forecast", "weatherAdvice"],
    "予報連動情報は記録されていません",
  );

  return (
    <div className="inspection-shell bg-gradient-to-b from-blue-100 to-white">
      <div className="inspection-panel">
        <div className="inspection-topbar">
          <span className="inspection-code">ANALYSIS REPORT</span>
          <span className="inspection-chip">completed</span>
        </div>
        <div className="inspection-body">
          <div className="inspection-hero">
            <div className="inspection-mascot">
              <KoupenSVG />
            </div>
            <div>
              <p className="inspection-kicker">Assessment Result</p>
              <h1 className="inspection-title">診断結果報告</h1>
              <p className="inspection-lead">
                保管環境に対する判定結果と推奨対応を確認できます。
              </p>
            </div>
          </div>
          <div className="inspection-divider" />
          <div className="inspection-grid">
            <div className="inspection-card">
              <div className="inspection-status">report available</div>
              <div className="inspection-report">
                <div className="inspection-row">
                  <p className="inspection-label">総合判定</p>
                  <p className="inspection-value">{placement}</p>
                </div>
                <div className="inspection-row">
                  <p className="inspection-label">推奨対応</p>
                  <p className="inspection-value">{advice}</p>
                </div>
                <div className="inspection-row">
                  <p className="inspection-label">予報参照</p>
                  <p className="inspection-value">{forecastNote}</p>
                </div>
              </div>
            </div>
            <div className="inspection-actions">
              <button
                onClick={() => navigate("/")}
                className="inspection-button inspection-button-primary"
              >
                新しい診断を開始する
              </button>
              <button
                onClick={() => navigate("/weathercamera")}
                className="inspection-button inspection-button-secondary"
              >
                予報連動診断へ進む
              </button>
            </div>
            <div className="inspection-footer-note text-center">
              {footerNote}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
