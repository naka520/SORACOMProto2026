import { CameraPage } from "../components/CameraPage";

export default function Camera() {
  return (
    <CameraPage
      title="もの置き診断カメラ"
      triggerEndpoint="torriger-flux"
      resultPath="/result"
    />
  );
}
