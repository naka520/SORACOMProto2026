import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Camera from "./pages/Camera";
import Result from "./pages/Result";
import WeatherCamera from "./pages/WeatherCamera";
import WeatherResult from "./pages/WeatherResult";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/camera" element={<Camera />} />
        <Route path="/result" element={<Result />} />
        <Route path="/weathercamera" element={<WeatherCamera />} />
        <Route path="/weatherresult" element={<WeatherResult />} />
      </Routes>
    </BrowserRouter>
  );
}
