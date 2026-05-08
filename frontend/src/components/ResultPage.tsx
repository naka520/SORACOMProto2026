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
  loadingNote = "GPSマルチユニットの温湿度と写真からもの置きの相性を診断してるよ〜！",
  footerNote = "設置前にリスクを確認して、物を長持ちさせよう",
}: ResultPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = searchParams.get("requestId")?.trim() ?? "";

  useEffect(() => {
    if (!requestId) {
      setError("requestId が見つかりません。もう一度撮影してください。");
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
        setError("診断結果の取得中にエラーが発生しました。");
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
          setError("診断結果の取得がタイムアウトしました。");
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-100 to-white">
        <KoupenSVG />
        <h1 className="text-2xl font-bold mb-4 text-blue-700">診断中だよ〜</h1>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4" />
          <p className="text-gray-600">
            SORACOM Fluxで診断中だよ、ちょっとまっててね～
          </p>
          <p className="text-sm text-gray-500 mt-2 text-center">
            {loadingNote}
          </p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-100 to-white">
        <KoupenSVG />
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mt-4">
          <h1 className="text-2xl font-bold mb-6 text-red-600">エラー</h1>
          <p className="mb-6">{error ?? "診断結果が見つかりませんでした"}</p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg w-full"
          >
            もう一度撮影する
          </button>
        </div>
      </div>
    );
  }

  const placement = readOutputText(
    result.output,
    ["placement", "shindan", "judge", "summary"],
    "判定情報がありません",
  );
  const advice = readOutputText(
    result.output,
    ["advice", "recommend", "countermeasure"],
    "アドバイス情報がありません",
  );
  const forecastNote = readOutputText(
    result.output,
    ["forecastNote", "weather", "forecast", "weatherAdvice"],
    "予報連動コメントはありません",
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-100 to-white">
      <KoupenSVG />
      <h1 className="text-2xl font-bold mb-4 text-blue-700">
        診断結果だよ〜！
      </h1>
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <div className="mb-4 text-gray-800 text-center space-y-2">
          <p>
            <span className="font-bold">総合判定：</span>
            {placement}
          </p>
          <p>
            <span className="font-bold">AIアドバイス：</span>
            {advice}
          </p>
          <p>
            <span className="font-bold">予報連動：</span>
            {forecastNote}
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg w-full transition mb-2"
        >
          もう一度診断する
        </button>
        <button
          onClick={() => navigate("/weathercamera")}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg w-full transition"
        >
          天気予報も含めて診断する
        </button>
      </div>
      <div className="mt-8 text-xs text-gray-400 text-center">{footerNote}</div>
    </div>
  );
}
