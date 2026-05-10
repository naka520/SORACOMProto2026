import { ResultPage } from "../components/ResultPage";

export default function WeatherResult() {
  return (
    <ResultPage
      diagnosisEndpoint="weather-diagnosis-result"
      maxRetries={60}
      loadingNote={
        "ウェザーニューズの予報情報と撮影画像を照合し、\n保管環境の適合性を判定しています。"
      }
      footerNote="湿度と降雨予測を確認し、継続設置の可否を判断してください。"
    />
  );
}
