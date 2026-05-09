# もの置き診断アプリ

GPSマルチユニット(SORACOM Edition)の温湿度データ、画像、天気予報を使って、
「この場所にこの物を置いて大丈夫か」を診断するTypeScriptアプリです。

このリポジトリは以下の2ディレクトリ構成です。

- `frontend/`: Vite + React (Azure Static Web Apps配信用)
- `functions/`: 独立した Azure Functions v4 TypeScript

## 技術スタック

- Frontend: Vite + React + TypeScript
- Backend: Azure Functions v4 (Node.js/TypeScript)
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

Function App のベース URL を `https://<function-app-name>.azurewebsites.net` とした場合:

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
  - 例: `https://<function-app-name>.azurewebsites.net`
  - GitHub Actions では `VITE_API_BASE_URL` を Secret として渡してビルドします
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
- API は Azure Functions へ個別デプロイ
- BlobコンテナはFluxから読める権限設計(公開 or 短期SAS)にする

## IaC (Bicep)

`infra/main.bicep`で以下を作成できます。

- Azure Storage Account
- Blobコンテナ(画像保存)
- Azure Functions(Linux, Consumption または Basic)
- Log Analytics + Application Insights
- Azure Static Web Apps

注意:

- このBicepは「基盤リソース作成」のみです。
- Function App のコード配信と Static Web Apps のフロント配信は別途必要です。

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
- `functionPlanSku`
- `staticWebAppSku`
- `staticWebAppRepositoryUrl` (GitHub連携を使う場合)

`functionPlanSku` の目安:

- `Y1`: Consumption。Dynamic VMs クォータが必要
- `B1`: Dedicated Basic。クォータ制約を避けやすい代わりに常時課金

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

### Azure Functions の配信手順

1. Function App の Publish Profile を取得

Portal 手順:

- Azure Portal で対象の Function App を開く
- `概要` を開く
- 上部メニューの `発行プロファイルの取得` を押す
- ダウンロードされた `.PublishSettings` の内容を GitHub Secret にそのまま貼り付ける

補足:

- 例の Function App 名: `monooki-dev-eastus-func`
- この名前は `projectName=monooki` / `environmentName=dev` / `location=eastus` 前提

2. GitHub Secrets に以下を登録

- `AZURE_FUNCTIONAPP_NAME`
- `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`

GitHub Secrets の場所:

- GitHub リポジトリを開く
- `Settings` → `Secrets and variables` → `Actions`
- `New repository secret` から追加する

3. Function App のアプリ設定に以下を登録

- `AZURE_STORAGE_CONTAINER_NAME`
- `AZURE_STORAGE_CONNECTION_STRING` または `AZURE_STORAGE_ACCOUNT_NAME` と `AZURE_STORAGE_ACCOUNT_KEY`
- `AZURE_BLOB_READ_SAS_TOKEN` 必要時のみ
- `SORACOM_FLUX_WEBHOOK_URL`
- `SORACOM_FLUX_WEATHER_WEBHOOK_URL`

Portal での設定場所:

- Azure Portal で対象の Function App を開く
- 左メニューの `設定` → `環境変数`
- `アプリ設定` タブで `追加`
- 入力後に `適用` → `確認`

運用メモ:

- `AZURE_STORAGE_CONNECTION_STRING` には SAS ではなく Storage の接続文字列を入れる
- Blob を非公開で読む必要がある場合だけ `AZURE_BLOB_READ_SAS_TOKEN` に SAS を入れる
- 独立 Azure Functions 構成で使うなら `infra/main.parameters.json` の `createFunctionApp` は `true` にしておく

4. このリポジトリの [./.github/workflows/azure-functions.yml](/home/kaede/SORACOMProto2026/.github/workflows/azure-functions.yml) で `functions/` をデプロイ

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

3. GitHub Secrets に `VITE_API_BASE_URL` を登録

- 例: `https://<function-app-name>.azurewebsites.net`

GitHub Secrets の場所:

- GitHub リポジトリを開く
- `Settings` → `Secrets and variables` → `Actions`
- `AZURE_STATIC_WEB_APPS_API_TOKEN` と `VITE_API_BASE_URL` を追加する

4. このリポジトリの [./.github/workflows/azure-static-web-apps.yml](/home/kaede/SORACOMProto2026/.github/workflows/azure-static-web-apps.yml) で `frontend/` を配信

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
- SORACOM Flux WebhookからFunction AppのWebhookへ到達できること
- フロントから診断結果APIを取得できること

確認 URL 例:

- Function App ベース URL
  - `https://monooki-dev-eastus-func.azurewebsites.net`
- 通常診断 webhook
  - `https://monooki-dev-eastus-func.azurewebsites.net/api/flux-webhook`
- 天気診断 webhook
  - `https://monooki-dev-eastus-func.azurewebsites.net/api/weather-flux-webhook`
- 通常診断結果取得
  - `https://monooki-dev-eastus-func.azurewebsites.net/api/diagnosis-result?requestId=<requestId>`
- 天気診断結果取得
  - `https://monooki-dev-eastus-func.azurewebsites.net/api/weather-diagnosis-result?requestId=<requestId>`

確認の見方:

- `/api/flux-webhook` と `/api/weather-flux-webhook` はブラウザで直接開く用途ではない
- `/api/diagnosis-result` と `/api/weather-diagnosis-result` は `requestId` なしだと 400 になる
- Blob 画像 URL を直接開いて `ResourceNotFound` なら、返却 URL と実在する Blob 名がずれている可能性が高い
