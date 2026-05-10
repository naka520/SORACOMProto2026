import { useNavigate } from "react-router-dom";
import { KoupenSVG } from "../components/KoupenSVG";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="inspection-shell bg-gradient-to-b from-blue-100 to-white">
      <div className="inspection-panel">
        <div className="inspection-topbar">
          <span className="inspection-code">MONOOKI DIAGNOSIS</span>
          <span className="inspection-chip">standby</span>
        </div>
        <div className="inspection-body">
          <div className="inspection-hero">
            <div className="inspection-mascot">
              <KoupenSVG size={120} />
            </div>
            <div>
              <p className="inspection-kicker">
                Storage Environment Assessment
              </p>
              <h1 className="inspection-title">もの置き環境 診断受付</h1>
              <p className="inspection-lead">
                保管予定場所の状態を確認し、設置可否を判定します。
                <br />
                温湿度、撮影画像、必要に応じて天気予報を用いて評価します。
              </p>
            </div>
          </div>
          <div className="inspection-divider" />
          <div className="inspection-grid">
            <div className="inspection-card">
              <button
                onClick={() => navigate("/camera")}
                className="inspection-button inspection-button-primary"
              >
                診断を開始する
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
