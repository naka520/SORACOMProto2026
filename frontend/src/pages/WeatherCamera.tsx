import { CameraPage } from "../components/CameraPage";

export default function WeatherCamera() {
  return (
    <CameraPage
      title="予報連動撮影診断"
      triggerEndpoint="weather-torriger-flux"
      resultPath="/weatherresult"
    />
  );
}
