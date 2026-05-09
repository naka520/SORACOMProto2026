import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  getDiagnosisResultFromBlob,
  getLatestDiagnosisResultFromBlob,
} from "../resultStorage";

async function weatherDiagnosisResult(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const requestId = request.query.get("requestId")?.trim();

  let result = requestId
    ? await getDiagnosisResultFromBlob("weather", requestId)
    : null;

  if (!result) {
    result = await getLatestDiagnosisResultFromBlob("weather");
  }

  context.log(
    "天気診断結果取得:",
    result
      ? `あり (${requestId ?? "latest"})`
      : `なし (${requestId ?? "latest"})`,
  );

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
