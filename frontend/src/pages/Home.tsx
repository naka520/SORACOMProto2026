import { useNavigate } from "react-router-dom";
import { KoupenSVG } from "../components/KoupenSVG";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-100 to-white">
      <div className="mb-6">
        <KoupenSVG size={120} />
      </div>
      <h1 className="text-2xl font-bold text-blue-700 mb-2">
        もの置き診断へようこそ！
      </h1>
      <p className="text-lg text-gray-700 mb-6 text-center max-w-md">
        <br />
        今の環境に物を置いて大丈夫かを診断するよ！
        <br />
        温湿度・画像・天気予報を使って判定するよ！
      </p>
      <button
        onClick={() => navigate("/camera")}
        className="bg-blue-400 hover:bg-blue-500 transition text-white px-8 py-4 rounded-full text-xl shadow-lg"
      >
        もの置き診断をはじめる
      </button>
    </div>
  );
}
