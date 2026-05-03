import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// 環境変数の存在確認をログに出力
console.log("環境変数確認:", {
  region: process.env.AWS_REGION,
  bucket: process.env.S3_BUCKET_NAME,
  hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
});

// S3クライアントの型を明示的に定義
let s3Client: S3Client;

try {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || "ap-northeast-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
  console.log("S3クライアント初期化完了");
} catch (initError) {
  console.error("S3クライアント初期化エラー:", initError);
  // 初期化失敗時にもクライアントを作成（エラー時の型問題を解決）
  s3Client = new S3Client({
    region: "ap-northeast-1",
    credentials: {
      accessKeyId: "",
      secretAccessKey: "",
    },
  });
}

// エラーインターフェイスを定義して any を避ける
interface S3Error extends Error {
  code?: string;
  $metadata?: {
    httpStatusCode?: number;
    requestId?: string;
  };
}

export async function POST(request: NextRequest) {
  console.log("API リクエスト受信");

  // 環境変数チェック
  if (
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY ||
    !process.env.S3_BUCKET_NAME
  ) {
    console.error("必要な環境変数が設定されていません");
    return NextResponse.json(
      { message: "サーバー設定エラー: 環境変数が不足しています" },
      { status: 500 }
    );
  }

  try {
    // フォームデータを取得
    console.log("フォームデータ取得開始");
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    console.log("フォームデータ取得完了", {
      hasFile: !!file,
      fileType: file?.type,
      fileSize: file?.size,
    });

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

    // ファイルをArrayBufferに変換
    console.log("ファイルバッファ変換開始");
    const fileBuffer = await file.arrayBuffer();
    console.log("ファイルバッファ変換完了", {
      bufferSize: fileBuffer.byteLength,
    });

    // ユニークなファイル名を生成
    const fileName = "image.jpg";
    console.log("生成されたファイル名:", fileName);

    // S3にアップロード
    console.log("S3アップロード開始");
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Body: Buffer.from(fileBuffer),
      ContentType: file.type || "image/jpeg",
    };
    console.log("アップロードパラメータ:", {
      bucket: uploadParams.Bucket,
      key: uploadParams.Key,
      contentType: uploadParams.ContentType,
      bodySize: fileBuffer.byteLength,
    });

    const uploadCommand = new PutObjectCommand(uploadParams);
    await s3Client.send(uploadCommand);
    console.log("S3アップロード完了");

    // 画像のURLを生成して返す
    const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    console.log("生成された画像URL:", imageUrl);

    return NextResponse.json({ imageUrl });
  } catch (error) {
    // ErrorをS3Error型にキャスト
    const s3Error = error as S3Error;

    // 詳細なエラー情報をログに出力
    console.error("アップロードエラーの詳細:", {
      message: s3Error.message,
      name: s3Error.name,
      stack: s3Error.stack,
      code: s3Error.code,
      statusCode: s3Error.$metadata?.httpStatusCode,
      requestId: s3Error.$metadata?.requestId,
    });

    // エラーの種類に応じたメッセージを返す
    let errorMessage = "アップロードに失敗しました";
    const statusCode = 500; // let から const に変更

    if (
      s3Error.name === "AccessDeniedException" ||
      s3Error.code === "AccessDenied"
    ) {
      errorMessage =
        "S3バケットへのアクセスが拒否されました。IAM権限を確認してください。";
    } else if (
      s3Error.name === "NoSuchBucket" ||
      s3Error.code === "NoSuchBucket"
    ) {
      errorMessage = "指定されたS3バケットが存在しません。";
    } else if (
      s3Error.name === "TimeoutError" ||
      s3Error.code === "TimeoutError"
    ) {
      errorMessage = "S3アップロード中にタイムアウトが発生しました。";
    }

    return NextResponse.json(
      { message: errorMessage, error: s3Error.message },
      { status: statusCode }
    );
  }
}
