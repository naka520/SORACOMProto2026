"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";

// 診断結果の型定義
interface DiagnosisResult {
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

// イラスト（SVG）
function KoupenSVG() {
  return (
    <svg width="80" height="80" viewBox="0 0 120 120">
      <ellipse
        cx="60"
        cy="70"
        rx="42"
        ry="40"
        fill="#fff"
        stroke="#bbb"
        strokeWidth="3"
      />
      <ellipse cx="60" cy="60" rx="38" ry="38" fill="#f6f6f6" />
      <ellipse cx="60" cy="70" rx="30" ry="28" fill="#fff" />
      <ellipse cx="50" cy="75" rx="4" ry="4" fill="#222" />
      <ellipse cx="70" cy="75" rx="4" ry="4" fill="#222" />
      <path d="M54 85 Q60 90 66 85" stroke="#222" strokeWidth="2" fill="none" />
      <ellipse cx="47" cy="82" rx="3" ry="2" fill="#fbb" opacity="0.7" />
      <ellipse cx="73" cy="82" rx="3" ry="2" fill="#fbb" opacity="0.7" />
    </svg>
  );
}

// Suspenseバウンダリの中で使用するためのコンポーネント
function ResultContent() {
  const router = useRouter();

  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleRetry = () => {
    router.push("/"); // ホーム画面に戻る
  };

  useEffect(() => {
    let retries = 0;

    const fetchResult = async () => {
      try {
        const response = await fetch(`/api/weather-diagnosis-result`);
        if (!response.ok) {
          if (response.status === 404) {
            return false;
          }
          throw new Error(`エラー: ${response.status}`);
        }
        const data = await response.json();
        if (data && Object.keys(data).length > 0) {
          setResult(data);
          setLoading(false);
          return true;
        }
      } catch (error) {
        console.error("結果取得エラー:", error);
        setError("診断結果の取得中にエラーが発生しました。");
        setLoading(false);
        return true;
      }
      return false;
    };

    const poll = async () => {
      const done = await fetchResult();
      if (!done) {
        retries += 1;
        if (retries > 60) {
          setError("診断結果の取得がタイムアウトしました。");
          setLoading(false);
          return;
        }
        setTimeout(poll, 2000);
      }
    };

    poll();

    return () => {
      retries = 0;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-100 to-white">
        <KoupenSVG />
        <h1 className="text-2xl font-bold mb-4 text-blue-700">診断中だよ〜</h1>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">
            SORACOM Fluxで診断中だよ、ちょっとまっててね～
          </p>
          <p className="text-sm text-gray-500 mt-2">
            ウェザーニューズのお天気情報と写真から
            <br />
            やさしく診断してるよ〜！
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
          <p className="mb-6">{error || "診断結果が見つかりませんでした"}</p>
          <button
            onClick={handleRetry}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg w-full"
          >
            もう一度撮影する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-100 to-white">
      <KoupenSVG />
      <h1 className="text-2xl font-bold mb-4 text-blue-700">
        診断結果だよ〜！
      </h1>
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <div className="mb-4 text-gray-800 text-center">
          <span className="font-bold">服装解析：</span>
          {result.output.shindan}
          <br />
          <span className="font-bold">おすすめ：</span>
          {result.output.recommend}
        </div>
        <button
          onClick={() => router.push("/")}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg w-full transition"
        >
          もう一度最初から診断する
        </button>
      </div>
      <div className="mt-8 text-xs text-gray-400 text-center">
        どんな服でも、あなたはすてきだよ〜！
      </div>
    </div>
  );
}

// メインのページコンポーネント
export default function Result() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-100 to-white">
          <KoupenSVG />
          <h1 className="text-2xl font-bold mb-6 text-blue-700">
            読み込み中...
          </h1>
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
