import { ResultPage } from "../components/ResultPage";

export default function Result() {
  return (
    <ResultPage
      diagnosisEndpoint="diagnosis-result"
      loadingNote={"GPSマルチユニットの温湿度と写真から\nもの置きの相性を診断してるよ〜！"}
      footerNote="設置前にリスクを確認して、物を長持ちさせよう"
    />
  );
}
