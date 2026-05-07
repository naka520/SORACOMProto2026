# もの置き診断アプリ

GPSマルチユニット(SORACOM Edition)の温湿度データ、画像、天気予報を使って、
「この場所にこの物を置いて大丈夫か」を診断するTypeScriptアプリです。

このリポジトリは以下の2ディレクトリ構成です。

- `frontend/`: Vite + React (Azure Static Web Apps配信用)
- `functions/`: Azure Static Web Apps の API としてデプロイする Azure Functions v4 TypeScript

## 技術スタック

- Frontend: Vite + React + TypeScript
- Backend: Azure Static Web Apps managed API (Azure Functions v4, Node.js/TypeScript)
- Storage: Azure Blob Storage
- Logic/AI: SORACOM Flux
- External API: ウェザーニューズAPI (Flux側で利用)

## 画面構成

- `/` : もの置き診断のトップ画面
- `/camera` : 画像撮影 -> Blobアップロード -> Fluxトリガー
- `/result` : 温湿度+画像の診断結果表示
- `/weathercamera` : 画像撮影 -> Blobアップロード -> 天気予報連携トリガー
- `/weatherresult` : 天気予報込み診断結果表示

## APIエンドポイント

Azure Static Web Apps 配下ではフロントと同一オリジンの `/api/*` として公開します。

- `POST /api/upload`
  - 画像をAzure Blob Storageへ保存
  - 応答で`imageUrl`を返却
- `POST /api/torriger-flux`
  - SORACOM Flux(通常診断)へデータ送信
- `POST /api/weather-torriger-flux`
  - SORACOM Flux(天気連携診断)へデータ送信
- `POST /api/flux-webhook`
  - Fluxの診断結果受け取り(通常)
- `GET /api/diagnosis-result`
  - 直近の診断結果取得(通常)
- `POST /api/weather-flux-webhook`
  - Fluxの診断結果受け取り(天気連携)
- `GET /api/weather-diagnosis-result`
  - 直近の診断結果取得(天気連携)

## 必須環境変数

### API側

Azure Blob Storage:

- `AZURE_STORAGE_CONTAINER_NAME`
- 次のどちらかを設定
  - `AZURE_STORAGE_CONNECTION_STRING`
  - `AZURE_STORAGE_ACCOUNT_NAME` と `AZURE_STORAGE_ACCOUNT_KEY`
- 任意: `AZURE_BLOB_READ_SAS_TOKEN`
  - Blobコンテナが非公開の場合、Fluxが画像へアクセスするための読み取りSAS

SORACOM Flux:

- `SORACOM_FLUX_WEBHOOK_URL`
- `SORACOM_FLUX_WEATHER_WEBHOOK_URL`

### Frontend側

- `VITE_API_BASE_URL`
  - 本番のSWA運用では未設定で構いません
  - ローカル開発で未設定の場合はViteプロキシ経由で `http://localhost:7071/api` が使われます

## ローカル実行

### 1. Frontend

```bash
cd frontend
npm ci
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

### 2. Functions

```bash
cd functions
npm ci
npm run build
npm run start
```

Functions Hostは `http://localhost:7071` で起動します。

## Azure展開方針

- フロントはAzure Static Web Appsへ配置
- API は Azure Static Web Apps の managed API として `functions/` を一緒に配信
- BlobコンテナはFluxから読める権限設計(公開 or 短期SAS)にする

## IaC (Bicep)

`infra/main.bicep`で以下を作成できます。

- Azure Storage Account
- Blobコンテナ(画像保存)
- Azure Static Web Apps

注意:

- このBicepは「基盤リソース作成」のみです。
- API は Static Web Apps デプロイ時に `functions/` から一緒に配信します。
- Storage Account と Static Web Apps 本体は別途デプロイが必要です。

### 事前準備

1. Azure CLI / Bicepのインストール確認

```bash
az version
az bicep version
```

2. Azureログイン

```bash
az login
az account set --subscription <your-subscription-id>
```

3. リソース名・リージョンを決定

- 例: Resource Group = `rg-monooki-dev`
- 例: Location = `japaneast`

### パラメータ編集

`infra/main.parameters.json`を環境に合わせて編集してください。

最低限見直す項目:

- `projectName`
- `environmentName`
- `location`
- `containerName`
- `staticWebAppSku`
- `staticWebAppRepositoryUrl` (GitHub連携を使う場合)

### デプロイ実行

```bash
./infra/deploy.sh <resource-group-name> <subscription-id> [location] [parameters-file]
```

例:

```bash
./infra/deploy.sh rg-monooki-eastus-dev <your-subscription-id> eastus infra/main.parameters.json
```

またはAzure CLIを直接実行:

```bash
az group create --name rg-monooki-eastus-dev --location eastus
az deployment group create \
	--resource-group rg-monooki-eastus-dev \
	--template-file infra/main.bicep \
	--parameters infra/main.parameters.json
```

### Static Web Apps の配信手順

#### A. GitHub Actions連携 (推奨)

1. SWAリソースからDeployment Tokenを取得

```bash
az staticwebapp secrets list \
	--name <swa-name> \
	--resource-group rg-monooki-eastus-dev \
	--query properties.apiKey -o tsv
```

2. GitHubリポジトリのSecretsに`AZURE_STATIC_WEB_APPS_API_TOKEN`として登録

3. このリポジトリの [./.github/workflows/azure-static-web-apps.yml](/home/kaede/SORACOMProto2026/.github/workflows/azure-static-web-apps.yml) を使って `frontend/` と `functions/` を同時に配信
4. SWA のアプリケーション設定に以下を登録
   - `AZURE_STORAGE_CONTAINER_NAME`
   - `AZURE_STORAGE_CONNECTION_STRING` または `AZURE_STORAGE_ACCOUNT_NAME` と `AZURE_STORAGE_ACCOUNT_KEY`
   - `AZURE_BLOB_READ_SAS_TOKEN` 必要時のみ
   - `SORACOM_FLUX_WEBHOOK_URL`
   - `SORACOM_FLUX_WEATHER_WEBHOOK_URL`

#### B. SWA CLIで手動デプロイ

```bash
cd frontend
npm ci
npm run build
npx @azure/static-web-apps-cli deploy \
	dist \
	--deployment-token <deployment-token> \
	--env production
```

### 疎通確認

- Blobコンテナに画像アップロードできること
- SORACOM Flux WebhookからSWAのWebhookへ到達できること
- フロントから診断結果APIを取得できること
