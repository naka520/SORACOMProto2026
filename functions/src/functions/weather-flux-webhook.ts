import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { extractRequestId } from "../requestId";
import {
  saveDiagnosisResultToBlob,
  StoredDiagnosisResult,
} from "../resultStorage";

async function weatherFluxWebhook(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    context.log(
      "Webhookリクエストヘッダー:",
      JSON.stringify(Object.fromEntries(request.headers), null, 2),
    );

    const payload = (await request.json()) as StoredDiagnosisResult;
    context.log("SORACOM Fluxからのwebhookを受信:", payload);

    const requestId = extractRequestId(payload);
    if (!requestId) {
      context.error("requestId が webhook payload に含まれていません");
      return {
        status: 400,
        jsonBody: { message: "requestId が見つかりません" },
      };
    }

    await saveDiagnosisResultToBlob("weather", requestId, payload);
    context.log("天気診断データをBlob Storageへ保存しました", requestId);

    return { jsonBody: { success: true } };
  } catch (error) {
    context.error("Webhookエラー:", error);
    return {
      status: 500,
      jsonBody: { message: "Webhookの処理に失敗しました" },
    };
  }
}

app.http("weather-flux-webhook", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "weather-flux-webhook",
  handler: weatherFluxWebhook,
});
