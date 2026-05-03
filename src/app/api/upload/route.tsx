import { NextRequest, NextResponse } from "next/server";
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

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

export async function POST(request: NextRequest) {
  console.log("Upload API request received");

  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
  if (!containerName) {
    console.error("AZURE_STORAGE_CONTAINER_NAME is missing");
    return NextResponse.json(
      { message: "サーバー設定エラー: 環境変数が不足しています" },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "ファイルがアップロードされていません" },
        { status: 400 }
      );
    }

    // ファイルサイズチェック
    if (file.size > 4 * 1024 * 1024) {
      // 4MBの制限
      return NextResponse.json(
        { message: "ファイルサイズが大きすぎます（最大4MB）" },
        { status: 400 }
      );
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

    return NextResponse.json({ imageUrl });
  } catch (error) {
    const e = error as Error;
    console.error("Azure Blob upload error:", e);

    return NextResponse.json(
      { message: "アップロードに失敗しました", error: e.message },
      { status: 500 }
    );
  }
}
