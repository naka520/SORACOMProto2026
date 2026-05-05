import { CameraPage } from "../components/CameraPage";

export default function WeatherCamera() {
  return (
    <CameraPage
      title="天気予報連携カメラ"
      triggerEndpoint="weather-torriger-flux"
      resultPath="/weatherresult"
    />
  );
}
