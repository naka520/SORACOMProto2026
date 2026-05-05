import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getWeatherDiagnosisResult } from "../weatherStore";

async function weatherDiagnosisResult(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const result = getWeatherDiagnosisResult();
  context.log("天気診断結果取得:", result ? "あり" : "なし");

  if (!result) {
    return { status: 404, jsonBody: { message: "結果が見つかりません" } };
  }

  return { jsonBody: result };
}

app.http("weather-diagnosis-result", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "weather-diagnosis-result",
  handler: weatherDiagnosisResult,
});
