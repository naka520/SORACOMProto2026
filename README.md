# もの置き診断アプリ

GPSマルチユニット(SORACOM Edition)の温湿度データ、画像、天気予報を使って、
「この場所にこの物を置いて大丈夫か」を診断するNext.jsアプリです。

Todo.mdの設計に合わせて、ストレージはAWS S3ではなくAzure Blob Storageを利用します。

## 技術スタック

- Frontend: Next.js (App Router, TypeScript)
- Storage: Azure Blob Storage
- Logic/AI: SORACOM Flux
- Backend Webhook: 本リポジトリのAPI Route (Azure Functionsへ置き換えやすい形)
- External API: ウェザーニューズAPI (Flux側で利用)

## 画面構成

- `/` : もの置き診断のトップ画面
- `/camera` : 画像撮影 -> Blobアップロード -> Fluxトリガー
- `/result` : 温湿度+画像の診断結果表示
- `/weathercamera` : 画像撮影 -> Blobアップロード -> 天気予報連携トリガー
- `/weatherresult` : 天気予報込み診断結果表示

## APIエンドポイント

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

### Azure Blob Storage

- `AZURE_STORAGE_CONTAINER_NAME`
- 次のどちらかを設定
	- `AZURE_STORAGE_CONNECTION_STRING`
	- `AZURE_STORAGE_ACCOUNT_NAME` と `AZURE_STORAGE_ACCOUNT_KEY`
- 任意: `AZURE_BLOB_READ_SAS_TOKEN`
	- Blobコンテナが非公開の場合、Fluxが画像へアクセスするための読み取りSAS

### SORACOM Flux

- `SORACOM_FLUX_WEBHOOK_URL`
- `SORACOM_FLUX_WEATHER_WEBHOOK_URL`

## ローカル実行

1. 依存関係をインストール

```bash
npm install
```

2. `.env.local`を作成して環境変数を設定

3. 開発サーバー起動

```bash
npm run dev
```

4. ブラウザで`http://localhost:3000`を開く

## Azure展開方針

- フロントはAzure Static Web Appsへ配置
- API Routeは以下のどちらかで運用
	- Azure Static Web AppsのFunctions連携
	- Azure Functions(TypeScript)へ切り出し
- BlobコンテナはFluxから読める権限設計(公開 or 短期SAS)にする

## IaC (Bicep)

`infra/main.bicep`で以下を作成できます。

- Azure Storage Account
- Blobコンテナ(画像保存)
- Azure Functions(Consumption, Linux)
- Log Analytics + Application Insights
- Azure Static Web Apps

注意:

- このBicepは「基盤リソース作成」を対象とします。
- Function Appのアプリ本体コード(zip deploy等)とStatic Web Appsのフロント配信は別途デプロイが必要です。

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

デプロイ結果(Outputs)確認:

```bash
az deployment group show \
	--resource-group rg-monooki-dev \
	--name <deployment-name> \
	--query properties.outputs
```

### デプロイ後の設定


1. Function Appアプリ設定の以下を本番値へ更新
	- `SORACOM_FLUX_WEBHOOK_URL`
	- `SORACOM_FLUX_WEATHER_WEBHOOK_URL`
	- 必要に応じて`AZURE_BLOB_READ_SAS_TOKEN`

2. 必要であればFunction Appへコードをデプロイ

```bash
az functionapp deployment source config-zip \
	--resource-group rg-monooki-dev \
	--name <function-app-name> \
	--src <path-to-zip>
```

3. Static Web AppsにNext.jsデプロイを接続

- GitHub Actions連携またはSWA CLIでフロントを公開

4. 疎通確認

- Blobコンテナに画像アップロードできること
- SORACOM Flux Webhookから`/api/flux-webhook`へ到達できること
- フロントから`/api/diagnosis-result`の取得ができること
