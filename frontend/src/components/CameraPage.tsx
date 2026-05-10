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
        "カメラ映像を取得できませんでした。端末のカメラ利用設定をご確認ください。",
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
      alert(
        error instanceof Error
          ? error.message
          : "診断処理を開始できませんでした",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inspection-shell bg-gradient-to-b from-blue-100 to-white">
      <div className="inspection-panel">
        <div className="inspection-topbar">
          <span className="inspection-code">CAPTURE SESSION</span>
          <span className="inspection-chip">
            {cameraActive ? "recording" : "standby"}
          </span>
        </div>
        <div className="inspection-body">
          <div className="inspection-hero">
            <div className="inspection-mascot">
              <KoupenSVG />
            </div>
            <div>
              <p className="inspection-kicker">Visual Evidence Intake</p>
              <h1 className="inspection-title">{title}</h1>
              <p className="inspection-lead">
                診断対象の設置環境を撮影し、記録用画像を登録してください。
              </p>
            </div>
          </div>

          <div className="inspection-divider" />

          {cameraError && (
            <div className="inspection-alert mb-6">{cameraError}</div>
          )}

          {!imageData ? (
            <div className="inspection-grid">
              <div className="inspection-card">
                <div className="inspection-section-title">
                  Current Capture View
                </div>
                <div className="inspection-frame mb-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="inspection-media"
                  />
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <p className="inspection-note">
                  対象物と周辺環境が確認できるよう、画面中央に収めてください。
                </p>
              </div>
              <div className="inspection-actions">
                {cameraActive && (
                  <button
                    onClick={captureImage}
                    className="inspection-button inspection-button-primary"
                  >
                    現在の画像を記録する
                  </button>
                )}
                {!cameraActive && !cameraError && (
                  <button
                    onClick={initCamera}
                    className="inspection-button inspection-button-primary"
                  >
                    カメラ確認を開始する
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="inspection-grid">
              <div className="inspection-card">
                <div className="inspection-section-title">
                  Captured Evidence
                </div>
                <div className="inspection-frame mb-4">
                  <img
                    src={imageData}
                    alt="撮影した画像"
                    className="inspection-media"
                  />
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="inspection-actions two-up">
                <button
                  onClick={retakeImage}
                  className="inspection-button inspection-button-secondary"
                >
                  再撮影する
                </button>
                <button
                  onClick={handleDiagnose}
                  disabled={loading}
                  className="inspection-button inspection-button-success disabled:opacity-50"
                >
                  {loading ? "診断要求を送信中..." : "この内容で診断する"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
