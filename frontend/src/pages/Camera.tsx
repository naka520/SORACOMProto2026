import { CameraPage } from "../components/CameraPage";

export default function Camera() {
  return (
    <CameraPage
      title="標準撮影診断"
      triggerEndpoint="torriger-flux"
      resultPath="/result"
    />
  );
}
