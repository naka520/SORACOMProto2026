import { ResultPage } from "../components/ResultPage";

export default function Result() {
  return (
    <ResultPage
      diagnosisEndpoint="diagnosis-result"
      loadingNote={
        "GPSマルチユニットの温湿度と撮影画像を照合し、\n保管環境の適合性を判定しています。"
      }
      footerNote="設置前に環境条件を確認し、保管対象への負荷を抑制してください。"
    />
  );
}
