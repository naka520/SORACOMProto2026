import { ResultPage } from "../components/ResultPage";

export default function WeatherResult() {
  return (
    <ResultPage
      diagnosisEndpoint="weather-diagnosis-result"
      maxRetries={60}
      loadingNote={"ウェザーニューズの予報と写真から\nもの置きの相性を診断してるよ〜！"}
      footerNote="湿度と降雨予報を確認して、置き場所を選ぼう"
    />
  );
}
