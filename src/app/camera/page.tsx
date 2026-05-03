"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Camera() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // カメラの初期化
  const initCamera = async () => {
    try {
      if (!videoRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      videoRef.current.srcObject = stream;
      setCameraActive(true);
      setCameraError(null);
    } catch (err) {
      console.error("カメラの初期化エラー:", err);
      setCameraError(
        "カメラにアクセスできませんでした。カメラの使用許可を確認してね〜！"
      );
    }
  };

  // カメラを停止
  const stopCamera = () => {
    if (!videoRef.current?.srcObject) return;

    const stream = videoRef.current.srcObject as MediaStream;
    const tracks = stream.getTracks();

    tracks.forEach(track => track.stop());
    videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  useEffect(() => {
    initCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // 写真を撮影
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const data = canvas.toDataURL("image/jpeg");
    setImageData(data);

    stopCamera();
  };

  // 撮り直し
  const retakeImage = () => {
    setImageData(null);
    initCamera();
  };

  const getCurrentPosition = async (): Promise<{
    latitude: number;
    longitude: number;
  } | null> => {
    if (!navigator.geolocation) {
      return null;
    }

    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 8000,
        }
      );
    });
  };

  // 画像をAzure BlobにアップロードしてSORACOM Fluxを起動
  const handleDiagnose = async () => {
    if (!imageData) return;

    setLoading(true);
    try {
      // Base64データをBlobに変換
      const response = await fetch(imageData);
      const blob = await response.blob();

      // FormDataを作成してファイルを追加
      const formData = new FormData();
      formData.append("file", blob, "capture.jpg");

      // 1. Azure Blob Storageにアップロード
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("アップロードに失敗しました");
      }

      const { imageUrl } = (await uploadResponse.json()) as {
        imageUrl: string;
      };

      const location = await getCurrentPosition();

      // 2. SORACOM Fluxにトリガー送信
      const triggerResponse = await fetch("/api/torriger-flux", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          location,
        }),
      });

      if (!triggerResponse.ok) {
        throw new Error("診断の開始に失敗しました");
      }

      // 3. 結果画面に遷移
      router.push(`/result`);
    } catch (error) {
      console.error("診断エラー:", error);
      alert("診断に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-100 to-white">
      {/* イラスト */}
      <div className="mb-4">
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
          <path
            d="M54 85 Q60 90 66 85"
            stroke="#222"
            strokeWidth="2"
            fill="none"
          />
          <ellipse cx="47" cy="82" rx="3" ry="2" fill="#fbb" opacity="0.7" />
          <ellipse cx="73" cy="82" rx="3" ry="2" fill="#fbb" opacity="0.7" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold mb-2 text-blue-700">もの置き診断カメラ</h1>
      <p className="text-lg text-gray-700 mb-6 text-center max-w-md">
        置きたい物をカメラで撮影してね〜！
      </p>

      {cameraError && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
          {cameraError}
        </div>
      )}

      {imageData ? (
        <div className="mb-6 flex flex-col items-center">
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "400px",
              height: "300px",
            }}
          >
            <Image
              src={imageData}
              alt="撮影した物"
              fill
              style={{ objectFit: "contain" }}
              sizes="(max-width: 768px) 100vw, 400px"
              className="rounded-lg shadow-lg"
              priority
            />
          </div>
          <div className="text-blue-600 mt-4 mb-2 font-semibold">
            ばっちり撮れたね〜！すごいよ〜！
          </div>
          <div className="flex mt-2 space-x-4">
            <button
              onClick={retakeImage}
              className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition"
              disabled={loading}
            >
              撮り直す
            </button>
            <button
              onClick={handleDiagnose}
              className={`bg-blue-500 hover:bg-blue-600 transition text-white px-6 py-2 rounded-lg shadow ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={loading}
            >
              {loading ? "診断中..." : "この写真で診断する"}
            </button>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            温湿度と画像をあわせて、置き場所の相性を診断するよ
          </div>
        </div>
      ) : (
        <div className="mb-6 flex flex-col items-center">
          <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full max-w-md h-auto"
              style={{ transform: "scaleX(-1)" }}
            />
            {cameraActive && (
              <button
                onClick={captureImage}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-4 shadow-lg"
                aria-label="写真を撮影"
              >
                <div className="w-12 h-12 rounded-full border-4 border-blue-400"></div>
              </button>
            )}
          </div>
          {!cameraActive && !cameraError && (
            <div className="text-center mt-4">
              <button
                onClick={initCamera}
                className="bg-blue-400 hover:bg-blue-500 text-white px-6 py-3 rounded-lg transition"
              >
                カメラを起動する
              </button>
            </div>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
