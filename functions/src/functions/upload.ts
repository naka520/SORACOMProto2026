import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";

function createBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString);
  }

  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  if (!accountName || !accountKey) {
    throw new Error(
      "Azure Storageの認証情報が不足しています。AZURE_STORAGE_CONNECTION_STRING または AZURE_STORAGE_ACCOUNT_NAME / AZURE_STORAGE_ACCOUNT_KEY を設定してください。"
    );
  }

  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  return new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    credential
  );
}

async function upload(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log("Upload API request received");

  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
  if (!containerName) {
    context.error("AZURE_STORAGE_CONTAINER_NAME is missing");
    return { status: 500, jsonBody: { message: "サーバー設定エラー: 環境変数が不足しています" } };
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return { status: 400, jsonBody: { message: "ファイルがアップロードされていません" } };
    }

    if (file.size > 4 * 1024 * 1024) {
      return { status: 400, jsonBody: { message: "ファイルサイズが大きすぎます（最大4MB）" } };
    }

    const fileBuffer = await file.arrayBuffer();
    const blobServiceClient = createBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();

    const fileName = `captures/${Date.now()}-image.jpg`;
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    await blockBlobClient.uploadData(Buffer.from(fileBuffer), {
      blobHTTPHeaders: {
        blobContentType: file.type || "image/jpeg",
      },
    });

    const sasToken = process.env.AZURE_BLOB_READ_SAS_TOKEN;
    const imageUrl = sasToken
      ? `${blockBlobClient.url}?${sasToken.replace(/^\?/, "")}`
      : blockBlobClient.url;

    return { jsonBody: { imageUrl } };
  } catch (error) {
    context.error("アップロードエラー:", error);
    return { status: 500, jsonBody: { message: "アップロードに失敗しました" } };
  }
}

app.http("upload", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "upload",
  handler: upload,
});
