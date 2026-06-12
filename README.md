<img width="1536" height="1024" alt="ChatGPT Image 2026年6月7日 10_04_28" src="https://github.com/user-attachments/assets/9ff4c6a3-5d88-4b51-94bc-1ced3e7c896a" />
<br>
このリポジトリは、以下の Google Cloud 構成で動かせるように調整しています。

- Cloud Run: Express / Node.js コンテナ
- Cloud SQL for MySQL: アプリ用 DB
- Artifact Registry: Docker image の保存先
- Secret Manager: DB パスワード、セッション secret、remember me 用キー
- Cloud Storage: 投稿画像、プロフィール画像、CKEditor 画像の保存先
  <br><br>

# Google Cloud / Cloud Run デプロイ手順（1. ~ 10.）

Cloud Shell 上、またはローカル環境（ Cloud SDK インストール済みのターミナル）で以下コマンド群を叩く

## 1. 使用する環境変数を設定する

以下コマンドを叩く

<sub># プロジェクトIDを "xxxx" 箇所に入れ、プロジェクトIDとリージョンの指定<br>
</sub>

```bash
# プロジェクトIDを "xxxx" 箇所に入れること

PROJECT_ID="xxxx"
REGION="asia-northeast1"
```

<sub># Docker image の保存先（Artifact Registry）の指定</sub>

```bash
REPOSITORY="dockerexpress"
SERVICE="dockerexpress"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE}:demo"
```

<sub># DB（Cloud SQL for MySQL）とテーブル/ユーザー名の指定</sub>

```bash
INSTANCE="dockerexpress-mysql"
DATABASE="express_db"
DB_USER="dockerexpress_user"
CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE}"
```

<sub># Cloud Run 用の実行サービスアカウントの指定</sub>

```bash
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
RUN_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
```

<sub># Cloud Build 用の実行サービスアカウントの指定</sub>

```bash
BUILD_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
CLOUDBUILD_BUCKET="${PROJECT_ID}_cloudbuild"
```

<sub># 画像の保存先（Cloud Storage）バケットの指定</sub>

```bash
BUCKET="${PROJECT_ID}-dockerexpress-uploads"
UPLOADS_BASE_URL="https://storage.googleapis.com/${BUCKET}/uploads"
```

<br>

## 2. Google Cloud の API を有効化する

以下コマンドを叩く

<sub># 操作対象となるデフォルトのプロジェクトを指定するコマンド</sub>

```bash
gcloud config set project "${PROJECT_ID}"
```

<sub># 指定したプロジェクト下の、今回使用するサービス/APIを有効化するコマンド</sub>

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com
```

<br>

## 3. Artifact Registry を作成

以下コマンドを叩く

<sub># コンテナイメージ保存先を作成するコマンド</sub>

```bash
gcloud artifacts repositories create "${REPOSITORY}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Docker Express demo images"
```

<br>

## 4. Cloud SQL for MySQL を作成

以下コマンドを叩く

<sub># 任意の文字列を "xxxx" 箇所に入れ、MySQLのルートパスワードとDBパスワードを指定<br>
特殊文字・記号を使用すると、`bash: !xxxx: event not found` エラーが出ることあり。<br>
（解消の仕方はあるが、demo目的なら半/全角英数字だけ用いるとよい）
</sub>

```bash
# 任意の文字列を "xxxx" 箇所に入れること

MYSQL_ROOT_PASSWORD="xxxx"
DB_PASSWORD="xxxx"
```

<sub># MySQLのインスタンスを作成、およびルートパスワードを設定するコマンド（※ 結構時間かかる）</sub>

```bash
gcloud sql instances create "${INSTANCE}" \
  --database-version=MYSQL_8_4 \
  --edition=ENTERPRISE \
  --region="${REGION}" \
  --tier=db-f1-micro \
  --storage-size=10GB \
  --availability-type=zonal \
  --root-password="${MYSQL_ROOT_PASSWORD}"
```

<sub># DBを作成するコマンド</sub>

```bash
gcloud sql databases create "${DATABASE}" \
  --instance="${INSTANCE}"
```

<sub># DBユーザーを作成、およびDBパスワードを設定するコマンド</sub>

```bash
gcloud sql users create "${DB_USER}" \
  --instance="${INSTANCE}" \
  --password="${DB_PASSWORD}"
```

<br>

## 5. Cloud Storage bucket を作成

以下コマンドを叩く

<sub># bucket を作成するコマンド</sub>

```bash
gcloud storage buckets create "gs://${BUCKET}" \
  --location="${REGION}" \
  --uniform-bucket-level-access
```

<sub># Cloud Run の実行サービスアカウントに bucket 権限を付与するコマンド<br>これにより、Cloud Run（アプリ側） から bucket への画像データの格納/読み書きが可能となる。</sub>

```bash
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:${RUN_SERVICE_ACCOUNT}" \
  --role="roles/storage.objectAdmin"
```

<sub># bucket データの公開オブジェクト設定のコマンド<br>これにより、一般ユーザーが bucket 内の画像を閲覧できるようになる。</sub>

```bash
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="allUsers" \
  --role="roles/storage.objectViewer"
```

<br>

## 6. Secret Manager に秘密情報を登録

以下コマンドを叩く

<sub># Secret Manage に DBパスワードなど秘密情報を登録するコマンド</sub>

```bash
printf '%s' "${DB_PASSWORD}" | gcloud secrets create DB_PASSWORD --data-file=-
openssl rand -base64 32 | gcloud secrets create SESSION_SECRET --data-file=-
openssl rand -base64 32 | gcloud secrets create APP_KEY --data-file=-
```

<sub># Cloud Run（アプリ側）から secret を参照できるよう、実行サービスアカウントへ権限を付与するコマンド</sub>

```bash
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUN_SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

<sub># Cloud Run（アプリ側）から Cloud SQL にアクセスできるよう、実行サービスアカウントへ権限を付与するコマンド</sub>

```bash
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUN_SERVICE_ACCOUNT}" \
  --role="roles/cloudsql.client"
```

<br>

## 7. Docker image を build & push

### 7-1. ソースコードを用意する

以下コマンドを叩く

<sub># git clone でこのアプリのソースをダウンロードする</sub>

```bash
git clone https://github.com/kazuyaTakahashi1988/docker-express.git
```

<sub># このアプリのソースがある階層に移動する</sub>

```bash
cd ~/docker-express
```

<sub># git switch で、このアプリの Google Cloud リリース用ブランチに切り替える</sub>

```bash
git switch for-google-cloud
```

<sub># このアプリ root にいることを確認するコマンド</sub>

```bash
pwd
test -f app/Dockerfile && test -f app/package.json && echo "OK: app build context exists"
```

<br>

### 7-2. 変数と Artifact Registry repository を確認する

以下コマンドを叩く

<sub># IMAGEの環境変数と Artifact Registry repository を確認するコマンド群（これら、不要なら無視してOK）</sub>

```bash
gcloud config set project "${PROJECT_ID}"
```

```bash
printf 'IMAGE=%s\n' "${IMAGE}"
```

```bash
gcloud artifacts repositories describe "${REPOSITORY}" \
  --location="${REGION}"
```

<br>

### 7-3. Cloud Build で build して Artifact Registry に push する

以下コマンドを叩く

<sub># ビルド回数およびバージョンを指定可。（不要なら無視してOK）</sub>

```bash
BUILD_PUSH_COUNT="1"
```

<sub># Cloud Build の実行サービスアカウントに build 実行権限を付与するコマンド</sub>

```bash
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${BUILD_SERVICE_ACCOUNT}" \
  --role="roles/cloudbuild.builds.builder"
```

<sub># Cloud Build の実行サービスアカウントに storage を読む権限を与えるコマンド</sub>

```bash
gcloud storage buckets add-iam-policy-binding "gs://${CLOUDBUILD_BUCKET}" \
  --member="serviceAccount:${BUILD_SERVICE_ACCOUNT}" \
  --role="roles/storage.objectViewer"
```

<sub># ソースコード `app/Dockerfile` を Artifact Registry に build & push するコマンド</sub>

```bash
gcloud builds submit app --tag "${IMAGE}"
```

<br>

### 7-4. もしも Artifact Registry への push 権限エラーが出た場合、追加で以下の対応を

<sub># Cloud Build の実行サービスアカウントに Artifact Registry へ Docker イメージを書き込む権限を与えるコマンド</sub>

```bash
gcloud artifacts repositories add-iam-policy-binding "${REPOSITORY}" \
  --location="${REGION}" \
  --member="serviceAccount:${BUILD_SERVICE_ACCOUNT}" \
  --role="roles/artifactregistry.writer"
```

<sub># ソースコード `app/Dockerfile` を Artifact Registry に build & push するコマンド</sub>

```bash
gcloud builds submit app --tag "${IMAGE}"
```

<br>

### 7-5. 無事に push できたことを確認する

以下コマンドを叩く

<sub># Artifact Registry に保存されている Docker イメージの一覧を表示するコマンド</sub>

```bash
gcloud artifacts docker images list \
  "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}"
```

<sub># 特定の Docker イメージに付いているタグ一覧を表示するコマンド</sub>

```bash
gcloud artifacts docker tags list \
  "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE}"
```

`TAG: demo` が表示されれば、Cloud Run に渡す image の準備は完了です。

<br>

## 8. build & push されたものを Cloud Run にデプロイ

以下コマンドを叩く

<sub># build & push されたものを Cloud Run にデプロイするコマンド</sub>

```bash
gcloud run deploy "${SERVICE}" \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --add-cloudsql-instances "${CONNECTION_NAME}" \
  --set-env-vars "NODE_ENV=production,DB_NAME=${DATABASE},DB_USER=${DB_USER},DB_DIALECT=mysql,TZ=Asia/Tokyo,DB_SOCKET_PATH=/cloudsql/${CONNECTION_NAME},GCS_BUCKET_NAME=${BUCKET},GCS_UPLOAD_PREFIX=uploads,UPLOADS_BASE_URL=${UPLOADS_BASE_URL},SITE_HOST=${SITE_HOST},DEFAULT_OGP_IMAGE_URL=${DEFAULT_OGP_IMAGE_URL},BUILD_PUSH_COUNT=${BUILD_PUSH_COUNT},UPLOAD_MAX_BYTES=5242880" \
  --set-secrets "DB_PASSWORD=DB_PASSWORD:latest,SESSION_SECRET=SESSION_SECRET:latest,APP_KEY=APP_KEY:latest" \
  --min-instances 0 \
  --max-instances 1
```

コマンド成功後、以下のように公開URLが表示されるので控えておくこと<br>
`" Service URL: https://xxxx.run.app "`

<br>

## 9. migration / seed を実行する

### 9-1. Cloud Run Jobs で migration を実行する

以下コマンドを叩く

<sub># migration job を作成するコマンド</sub>

```bash
gcloud run jobs create dockerexpress-migrate \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --set-cloudsql-instances "${CONNECTION_NAME}" \
  --set-env-vars "NODE_ENV=production,DB_NAME=${DATABASE},DB_USER=${DB_USER},DB_DIALECT=mysql,TZ=Asia/Tokyo,DB_SOCKET_PATH=/cloudsql/${CONNECTION_NAME},GCS_BUCKET_NAME=${BUCKET},GCS_UPLOAD_PREFIX=uploads,UPLOADS_BASE_URL=${UPLOADS_BASE_URL},SITE_HOST=${SITE_HOST},DEFAULT_OGP_IMAGE_URL=${DEFAULT_OGP_IMAGE_URL},BUILD_PUSH_COUNT=${BUILD_PUSH_COUNT},UPLOAD_MAX_BYTES=5242880" \
  --set-secrets "DB_PASSWORD=DB_PASSWORD:latest,SESSION_SECRET=SESSION_SECRET:latest,APP_KEY=APP_KEY:latest" \
  --command npm \
  --args run,migrate
```

<sub># migration job を実行するコマンド</sub>

```bash
gcloud run jobs execute dockerexpress-migrate \
  --region "${REGION}" \
  --wait
```

<br>

### 9-2. Cloud Run Jobs で seed を実行する

以下コマンドを叩く

<sub># seed job を作成するコマンド</sub>

```bash
gcloud run jobs create dockerexpress-seed \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --set-cloudsql-instances "${CONNECTION_NAME}" \
  --set-env-vars "NODE_ENV=production,DB_NAME=${DATABASE},DB_USER=${DB_USER},DB_DIALECT=mysql,TZ=Asia/Tokyo,DB_SOCKET_PATH=/cloudsql/${CONNECTION_NAME},GCS_BUCKET_NAME=${BUCKET},GCS_UPLOAD_PREFIX=uploads,UPLOADS_BASE_URL=${UPLOADS_BASE_URL},SITE_HOST=${SITE_HOST},DEFAULT_OGP_IMAGE_URL=${DEFAULT_OGP_IMAGE_URL},BUILD_PUSH_COUNT=${BUILD_PUSH_COUNT},UPLOAD_MAX_BYTES=5242880" \
  --set-secrets "DB_PASSWORD=DB_PASSWORD:latest,SESSION_SECRET=SESSION_SECRET:latest,APP_KEY=APP_KEY:latest" \
  --command npm \
  --args run,seed

```

<sub># seed job を実行するコマンド</sub>

```bash
gcloud run jobs execute dockerexpress-seed \
  --region "${REGION}" \
  --wait
```

これにてリリース完了です。<br>
先ほど控えた公開URL `" Service URL: https://xxxx.run.app "` をブラウザで確認する。
<br>

<br>

## 10. SNSシェアに対応したい場合（twitter:cardなど）、追加で以下の対応を

以下コマンドを叩く

<sub># アプリ内（メタ情報など）のデフォルト値を指定<br>

```bash
# 先ほど控えた公開URLを SITE_HOST に入れる

SITE_HOST="https://xxxx.run.app"
```

```bash
# Google Cloud コンソール画面にて ${BUCKET} バケットの " /images/common/ogp.png " にデフォルトOGP画像を直接格納しておくこと

DEFAULT_OGP_IMAGE_URL="https://storage.googleapis.com/${BUCKET}/images/common/ogp.png"
```

<sub># （手順8.と同様）build & push されたものを Cloud Run にデプロイするコマンド</sub>

```bash
gcloud run deploy "${SERVICE}" \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --add-cloudsql-instances "${CONNECTION_NAME}" \
  --set-env-vars "NODE_ENV=production,DB_NAME=${DATABASE},DB_USER=${DB_USER},DB_DIALECT=mysql,TZ=Asia/Tokyo,DB_SOCKET_PATH=/cloudsql/${CONNECTION_NAME},GCS_BUCKET_NAME=${BUCKET},GCS_UPLOAD_PREFIX=uploads,UPLOADS_BASE_URL=${UPLOADS_BASE_URL},SITE_HOST=${SITE_HOST},DEFAULT_OGP_IMAGE_URL=${DEFAULT_OGP_IMAGE_URL},BUILD_PUSH_COUNT=${BUILD_PUSH_COUNT},UPLOAD_MAX_BYTES=5242880" \
  --set-secrets "DB_PASSWORD=DB_PASSWORD:latest,SESSION_SECRET=SESSION_SECRET:latest,APP_KEY=APP_KEY:latest" \
  --min-instances 0 \
  --max-instances 1
```

公開URLをブラウザで確認する。
<br><br>

## 11. 他、リソース削除方法

個別に削除する場合の例です。

```bash
gcloud run services delete "${SERVICE}" --region "${REGION}"
gcloud run jobs delete dockerexpress-migrate --region "${REGION}"
gcloud run jobs delete dockerexpress-seed --region "${REGION}"
gcloud sql instances delete "${INSTANCE}"
gcloud artifacts repositories delete "${REPOSITORY}" --location "${REGION}"
gcloud storage rm --recursive "gs://${BUCKET}"
gcloud storage buckets delete "gs://${BUCKET}"
gcloud secrets delete DB_PASSWORD
gcloud secrets delete SESSION_SECRET
gcloud secrets delete APP_KEY
```
