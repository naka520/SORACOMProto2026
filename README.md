# もの置き診断アプリ

GPSマルチユニット(SORACOM Edition)の温湿度データ、画像、天気予報を使って、
「この場所にこの物を置いて大丈夫か」を診断するTypeScriptアプリです。

このリポジトリは以下の2アプリ構成です。

- `frontend/`: Vite + React (Azure Static Web Apps配信用)
- `functions/`: Azure Functions v4 TypeScript (zip deploy)

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

## APIエンドポイント (Function App)

Function AppのベースURLを `https://<function-app-name>.azurewebsites.net` とした場合:

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

### Functions側

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

## IaC (Bicep)

`infra/main.bicep`で以下を作成できます。

- Azure Storage Account
- Blobコンテナ(画像保存)
- Azure Functions(Consumption, Linux)
- Log Analytics + Application Insights
- Azure Static Web Apps

注意:

- このBicepは「基盤リソース作成」のみです。
- Function Appのアプリ本体コード(zip deploy)とStatic Web Appsのフロント配信は別途必要です。

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
- `environment`
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
./infra/deploy.sh rg-monooki-dev <your-subscription-id> japaneast infra/main.parameters.json
```

またはAzure CLIを直接実行:

```bash
az group create --name rg-monooki-dev --location japaneast
az deployment group create \
	--resource-group rg-monooki-dev \
	--template-file infra/main.bicep \
	--parameters infra/main.parameters.json
```

### Function Appアプリ本体コードのデプロイ手順 (zip deploy)

1. Functions用コードをビルドしてzip化

```bash
cd functions
npm ci
npm run build
zip -r ../functionapp.zip . -x "node_modules/.cache/*"
cd -
```

2. zip deployを実行

```bash
az functionapp deployment source config-zip \
	--resource-group rg-monooki-dev \
	--name <function-app-name> \
	--src functionapp.zip
```

3. デプロイ確認

```bash
az functionapp function list \
	--resource-group rg-monooki-dev \
	--name <function-app-name> \
	--query "[].name"
```

### Static Web Appsのフロント配信手順

#### A. GitHub Actions連携 (推奨)

1. SWAリソースからDeployment Tokenを取得

```bash
az staticwebapp secrets list \
	--name <swa-name> \
	--resource-group rg-monooki-dev \
	--query properties.apiKey -o tsv
```

2. GitHubリポジトリのSecretsに`AZURE_STATIC_WEB_APPS_API_TOKEN`として登録

3. Actionsで`frontend/`をビルドして`dist/`を配信
	- `app_location: "frontend"`
	- `output_location: "dist"`

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
