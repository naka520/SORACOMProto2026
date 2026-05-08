import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getDiagnosisResultFromBlob } from "../resultStorage";

async function diagnosisResult(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const requestId = request.query.get("requestId")?.trim();
  if (!requestId) {
    return { status: 400, jsonBody: { message: "requestId が必要です" } };
  }

  const result = await getDiagnosisResultFromBlob("normal", requestId);
  context.log(
    "診断結果取得:",
    result ? `あり (${requestId})` : `なし (${requestId})`,
  );

  if (!result) {
    return { status: 404, jsonBody: { message: "結果が見つかりません" } };
  }

  return { jsonBody: result };
}

app.http("diagnosis-result", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "diagnosis-result",
  handler: diagnosisResult,
});
