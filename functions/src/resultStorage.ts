import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

export type DiagnosisKind = "normal" | "weather";

export interface StoredDiagnosisResult {
  output?: Record<string, unknown>;
  usage?: Record<string, unknown>;
  [key: string]: unknown;
}

function createBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString);
  }

  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  if (!accountName || !accountKey) {
    throw new Error(
      "Azure Storageの認証情報が不足しています。AZURE_STORAGE_CONNECTION_STRING または AZURE_STORAGE_ACCOUNT_NAME / AZURE_STORAGE_ACCOUNT_KEY を設定してください。",
    );
  }

  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  return new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    credential,
  );
}

function getContainerName(): string {
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
  if (!containerName) {
    throw new Error("AZURE_STORAGE_CONTAINER_NAME が設定されていません");
  }
  return containerName;
}

function getResultBlobPath(kind: DiagnosisKind, requestId: string): string {
  return `results/${kind}/${requestId}.json`;
}

function getLatestResultBlobPath(kind: DiagnosisKind): string {
  return `results/${kind}/latest.json`;
}

export async function saveDiagnosisResultToBlob(
  kind: DiagnosisKind,
  requestId: string | null,
  payload: StoredDiagnosisResult,
): Promise<void> {
  const blobServiceClient = createBlobServiceClient();
  const containerClient =
    blobServiceClient.getContainerClient(getContainerName());
  await containerClient.createIfNotExists();

  const storedPayload = requestId ? { ...payload, requestId } : payload;

  const latestBlobClient = containerClient.getBlockBlobClient(
    getLatestResultBlobPath(kind),
  );
  const latestBody = JSON.stringify(storedPayload, null, 2);
  await latestBlobClient.upload(latestBody, Buffer.byteLength(latestBody), {
    blobHTTPHeaders: {
      blobContentType: "application/json; charset=utf-8",
    },
  });

  if (!requestId) {
    return;
  }

  const blobClient = containerClient.getBlockBlobClient(
    getResultBlobPath(kind, requestId),
  );
  const body = JSON.stringify(storedPayload, null, 2);
  await blobClient.upload(body, Buffer.byteLength(body), {
    blobHTTPHeaders: {
      blobContentType: "application/json; charset=utf-8",
    },
  });
}

export async function getDiagnosisResultFromBlob(
  kind: DiagnosisKind,
  requestId: string,
): Promise<StoredDiagnosisResult | null> {
  const blobServiceClient = createBlobServiceClient();
  const containerClient =
    blobServiceClient.getContainerClient(getContainerName());
  const blobClient = containerClient.getBlockBlobClient(
    getResultBlobPath(kind, requestId),
  );

  if (!(await blobClient.exists())) {
    return null;
  }

  const buffer = await blobClient.downloadToBuffer();
  return JSON.parse(buffer.toString("utf-8")) as StoredDiagnosisResult;
}

export async function getLatestDiagnosisResultFromBlob(
  kind: DiagnosisKind,
): Promise<StoredDiagnosisResult | null> {
  const blobServiceClient = createBlobServiceClient();
  const containerClient =
    blobServiceClient.getContainerClient(getContainerName());
  const blobClient = containerClient.getBlockBlobClient(
    getLatestResultBlobPath(kind),
  );

  if (!(await blobClient.exists())) {
    return null;
  }

  const buffer = await blobClient.downloadToBuffer();
  return JSON.parse(buffer.toString("utf-8")) as StoredDiagnosisResult;
}
