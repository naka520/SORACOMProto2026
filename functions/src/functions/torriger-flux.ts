import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

async function torrigerFlux(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = await request.json();

    const webhookUrl = process.env.SORACOM_FLUX_WEBHOOK_URL;
    if (!webhookUrl) {
      return { status: 500, jsonBody: { message: "SORACOM_FLUX_WEBHOOK_URL が設定されていません" } };
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      context.error("SORACOM Flux呼び出しエラー:", errorData);
      return { status: 500, jsonBody: { message: "SORACOM Fluxへの送信に失敗しました" } };
    }

    return { jsonBody: { success: true } };
  } catch (error) {
    context.error("トリガーエラー:", error);
    return { status: 500, jsonBody: { message: "診断の開始に失敗しました" } };
  }
}

app.http("torriger-flux", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "torriger-flux",
  handler: torrigerFlux,
});
