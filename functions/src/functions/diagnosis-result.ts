import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getDiagnosisResult } from "../store";

async function diagnosisResult(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const result = getDiagnosisResult();
  context.log("診断結果取得:", result ? "あり" : "なし");

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
