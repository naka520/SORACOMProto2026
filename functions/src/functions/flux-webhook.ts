import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { saveDiagnosisResult, DiagnosisResult } from "../store";

async function fluxWebhook(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    context.log("Webhookリクエストヘッダー:", JSON.stringify(Object.fromEntries(request.headers), null, 2));

    const payload = await request.json() as DiagnosisResult;
    context.log("SORACOM Fluxからのwebhookを受信:", payload);

    saveDiagnosisResult(payload);
    context.log("診断データを保存しました");

    return { jsonBody: { success: true } };
  } catch (error) {
    context.error("Webhookエラー:", error);
    return { status: 500, jsonBody: { message: "Webhookの処理に失敗しました" } };
  }
}

app.http("flux-webhook", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "flux-webhook",
  handler: fluxWebhook,
});
