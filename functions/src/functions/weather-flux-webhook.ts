import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { saveWeatherDiagnosisResult, DiagnosisResult } from "../weatherStore";

async function weatherFluxWebhook(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    context.log("Webhookリクエストヘッダー:", JSON.stringify(Object.fromEntries(request.headers), null, 2));

    const payload = await request.json() as DiagnosisResult;
    context.log("SORACOM Fluxからのwebhookを受信:", payload);

    saveWeatherDiagnosisResult(payload);
    context.log("天気診断データを保存しました");

    return { jsonBody: { success: true } };
  } catch (error) {
    context.error("Webhookエラー:", error);
    return { status: 500, jsonBody: { message: "Webhookの処理に失敗しました" } };
  }
}

app.http("weather-flux-webhook", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "weather-flux-webhook",
  handler: weatherFluxWebhook,
});
