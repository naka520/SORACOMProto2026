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

async function diagnosisResult(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const requestId = request.query.get("requestId")?.trim();

  let result = requestId
    ? await getDiagnosisResultFromBlob("normal", requestId)
    : null;

  if (!result) {
    result = await getLatestDiagnosisResultFromBlob("normal");
  }

  context.log(
    "診断結果取得:",
    result
      ? `あり (${requestId ?? "latest"})`
      : `なし (${requestId ?? "latest"})`,
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
