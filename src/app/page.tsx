"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-100 to-white">
      <div className="mb-6">
        <svg width="120" height="120" viewBox="0 0 120 120">
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
          {/* 顔 */}
          <ellipse cx="60" cy="70" rx="30" ry="28" fill="#fff" />
          {/* 目 */}
          <ellipse cx="50" cy="75" rx="4" ry="4" fill="#222" />
          <ellipse cx="70" cy="75" rx="4" ry="4" fill="#222" />
          {/* くち */}
          <path
            d="M54 85 Q60 90 66 85"
            stroke="#222"
            strokeWidth="2"
            fill="none"
          />
          {/* ほっぺ */}
          <ellipse cx="47" cy="82" rx="3" ry="2" fill="#fbb" opacity="0.7" />
          <ellipse cx="73" cy="82" rx="3" ry="2" fill="#fbb" opacity="0.7" />
        </svg>
      </div>
      {/* やさしいメッセージ */}
      <h1 className="text-2xl font-bold text-blue-700 mb-2">
        快適！服装診断へようこそ！
      </h1>
      <p className="text-lg text-gray-700 mb-6 text-center max-w-md">
        <br />
        今の環境にぴったりの服装を診断するよ！
        <br />
        どんな結果でも、あなたはとってもすてきだよ！
      </p>
      <button
        onClick={() => router.push("/camera")}
        className="bg-blue-400 hover:bg-blue-500 transition text-white px-8 py-4 rounded-full text-xl shadow-lg"
      >
        服装診断をはじめる
      </button>
    </div>
  );
}
