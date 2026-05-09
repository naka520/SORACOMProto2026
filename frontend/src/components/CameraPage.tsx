import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { KoupenSVG } from "../components/KoupenSVG";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function readErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message ?? fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function describeError(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

async function getCurrentPosition(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  if (!navigator.geolocation) return null;
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

interface CameraPageProps {
  title: string;
  triggerEndpoint: string;
  resultPath: string;
}

function createRequestId(): string {
  return crypto.randomUUID();
}

export function CameraPage({
  title,
  triggerEndpoint,
  resultPath,
}: CameraPageProps) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    } catch {
      setCameraError(
        "カメラにアクセスできませんでした。カメラの使用許可を確認してね〜！",
      );
    }
  };

  const stopCamera = () => {
    if (!videoRef.current?.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach(t => t.stop());
    videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  useEffect(() => {
    initCamera();
    return () => stopCamera();
  }, []);

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas
      .getContext("2d")
      ?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setImageData(canvas.toDataURL("image/jpeg"));
    stopCamera();
  };

  const retakeImage = () => {
    setImageData(null);
    initCamera();
  };

  const handleDiagnose = async () => {
    if (!imageData) return;
    setLoading(true);
    try {
      const imageResponse = await fetch(imageData).catch(error => {
        throw new Error(
          `撮影画像の変換に失敗しました: ${describeError(error, "画像データを読み取れません")}`,
        );
      });
      const blob = await imageResponse.blob();
      const formData = new FormData();
      formData.append("file", blob, "capture.jpg");

      const uploadUrl = `${API_BASE}/api/upload`;
      const triggerUrl = `${API_BASE}/api/${triggerEndpoint}`;

      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      }).catch(error => {
        throw new Error(
          `画像アップロード通信に失敗しました: ${describeError(error, uploadUrl)}`,
        );
      });
      if (!uploadRes.ok) {
        throw new Error(
          await readErrorMessage(uploadRes, "アップロードに失敗しました"),
        );
      }
      const { imageUrl } = (await uploadRes.json()) as { imageUrl: string };

      const location = await getCurrentPosition();
      const requestId = createRequestId();

      const triggerRes = await fetch(triggerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, location, requestId }),
      }).catch(error => {
        throw new Error(
          `診断API通信に失敗しました: ${describeError(error, triggerUrl)}`,
        );
      });
      if (!triggerRes.ok) {
        throw new Error(
          await readErrorMessage(triggerRes, "診断の開始に失敗しました"),
        );
      }

      navigate(`${resultPath}?requestId=${encodeURIComponent(requestId)}`);
    } catch (error) {
      console.error("診断エラー:", error);
      alert(error instanceof Error ? error.message : "診断に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-100 to-white">
      <div className="mb-4">
        <KoupenSVG />
      </div>
      <h1 className="text-2xl font-bold mb-2 text-blue-700">{title}</h1>
      <p className="text-lg text-gray-700 mb-6 text-center max-w-md">
        置きたい物をカメラで撮影してね〜！
      </p>

      {cameraError && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6 max-w-md w-full">
          {cameraError}
        </div>
      )}

      {!imageData ? (
        <div className="w-full max-w-md">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg shadow-lg mb-4"
          />
          <canvas ref={canvasRef} className="hidden" />
          {cameraActive && (
            <button
              onClick={captureImage}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-full text-xl shadow-lg w-full transition"
            >
              撮影する
            </button>
          )}
          {!cameraActive && !cameraError && (
            <button
              onClick={initCamera}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-full text-xl shadow-lg w-full transition"
            >
              カメラを起動する
            </button>
          )}
        </div>
      ) : (
        <div className="w-full max-w-md">
          <img
            src={imageData}
            alt="撮影した画像"
            className="w-full rounded-lg shadow-lg mb-4"
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-4">
            <button
              onClick={retakeImage}
              className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-3 rounded-lg transition"
            >
              撮り直す
            </button>
            <button
              onClick={handleDiagnose}
              disabled={loading}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading ? "送信中…" : "診断する"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
