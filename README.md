# 必要ローカル開発環境

- Docker v29.5.2 以降
- Docker Compose v5.1.4 以降<br>
  <sub>※ コンテナ内：Node.js 24 LTS 系を使用（`node:24-alpine`）</sub><br>
  <sub>※ コンテナ内：MySQL 8.4 LTS 系を使用（`mysql:8.4`）</sub>
  <br>

# 初回セットアップ

compose.yaml ファイルがある場所でターミナルを開き、以下のコマンドを叩く　　

<sub>※ ポート番号は　80　/　3000　をそれぞれ使用</sub>

```bash
cp .env.example .env

docker compose build
docker compose up -d
```

上記コマンド成功後、ローカルフォルダ `app` 内に `dist` & `node_modules` フォルダが自動生成される
<br>
<sub>（裏でコンパイルおよびシンクが走っているため2~3分、要待ち）</sub>
<br>
<br>
↓↓↓↓↓
<br>
<br>
自動生成されたのを確認できた後、以下のコマンドを叩く　

```bash
docker compose exec dockerexpress npm run migrate
docker compose exec dockerexpress npm run seed
```

↓↓↓↓↓
<br>

## Open in your browser

- アプリ： <http://localhost:3000>
- phpMyAdmin： <http://localhost:8080><br>
  <sub>※ phpMyAdmin はアイパス『 root 』でログイン可</sub>

<br>

## アプリが開けない場合、追加で以下のコマンドを叩く

```bash
docker compose exec dockerexpress npm run typecheck
docker compose exec dockerexpress npm run build
docker compose exec dockerexpress npm run dev
```

# Google Cloud / Cloud Run デプロイ手順

このリポジトリは、以下の Google Cloud 構成で動かせるように調整しています。

- Cloud Run: Express / Node.js コンテナ
- Cloud SQL for MySQL: アプリ用 DB
- Artifact Registry: Docker image の保存先
- Secret Manager: DB パスワード、セッション secret、remember me 用キー
- Cloud Storage: 投稿画像、プロフィール画像、CKEditor 画像の保存先

## 前提値

今回のデモでは以下の値を使います。

```bash
PROJECT_ID="project-fa900d56-8f52-4a54-867"
REGION="asia-northeast1"
REPOSITORY="dockerexpress"
SERVICE="dockerexpress"
INSTANCE="dockerexpress-mysql"
DATABASE="express_db"
DB_USER="dockerexpress_user"
BUCKET="${PROJECT_ID}-dockerexpress-uploads"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE}:demo"
CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE}"
```

## このアプリ側で追加した Cloud Run 対応

- Docker image の build 時に `npm run build` を実行し、Cloud Run の起動コマンド `npm start` が参照する `dist/bin/www.js` を image 内に生成します。
- `DB_SOCKET_PATH=/cloudsql/<INSTANCE_CONNECTION_NAME>` を設定した場合、Sequelize が Cloud SQL の Unix socket で MySQL に接続します。
- `GCS_BUCKET_NAME` を設定した場合、アップロード画像をローカルファイルシステムではなく Cloud Storage の `uploads/` prefix に保存します。
- `/uploads/<fileName>` へのアクセス時、Cloud Storage 有効時はアプリが Cloud Storage から画像を取得して返します。bucket を public にしなくても、Cloud Run のサービスアカウントに権限があれば表示できます。

## 1. Google Cloud の API を有効化

```bash
gcloud config set project "${PROJECT_ID}"

gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com
```

## 2. Artifact Registry を作成

```bash
gcloud artifacts repositories create "${REPOSITORY}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Docker Express demo images"
```

## 3. Cloud SQL for MySQL を作成

勉強会デモ向けの最小構成例です。発表後は停止または削除してください。

MySQL 8.4 は edition を省略すると Cloud SQL Enterprise Plus として作成されますが、`db-f1-micro` は Enterprise Plus では使えません。勉強会デモで安価な shared-core の `db-f1-micro` を使うため、ここでは `--edition=ENTERPRISE` を明示します。

パスワードに `!` が含まれる場合、Bash では double quote (`"`) の中でも history expansion が働き、`bash: !xxx: event not found` になることがあります。Cloud Shell では次のように `read -rs` で変数へ入れてから実行すると、`!` を含むパスワードでも安全に扱えます。

```bash
read -rsp "Cloud SQL root password: " MYSQL_ROOT_PASSWORD
echo
read -rsp "Application DB user password: " DB_PASSWORD
echo

gcloud sql instances create "${INSTANCE}" \
  --database-version=MYSQL_8_4 \
  --edition=ENTERPRISE \
  --region="${REGION}" \
  --tier=db-f1-micro \
  --storage-size=10GB \
  --availability-type=zonal \
  --root-password="${MYSQL_ROOT_PASSWORD}"

gcloud sql databases create "${DATABASE}" \
  --instance="${INSTANCE}"

gcloud sql users create "${DB_USER}" \
  --instance="${INSTANCE}" \
  --password="${DB_PASSWORD}"
```

短いデモで直接パスワードを書く場合は、double quote ではなく single quote で囲んでください。例: `--root-password='your!strong%password'`。ただし、コマンド履歴に残りやすいため、上の `read -rs` 方式を推奨します。

## 4. Cloud Storage bucket を作成

```bash
gcloud storage buckets create "gs://${BUCKET}" \
  --location="${REGION}" \
  --uniform-bucket-level-access
```

Cloud Run から private bucket に読み書きするため、Cloud Run の実行サービスアカウントに bucket 権限を付与します。

```bash
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
RUN_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:${RUN_SERVICE_ACCOUNT}" \
  --role="roles/storage.objectAdmin"
```

## 5. Secret Manager に秘密情報を登録

```bash
printf '%s' "${DB_PASSWORD}" | gcloud secrets create DB_PASSWORD --data-file=-
openssl rand -base64 32 | gcloud secrets create SESSION_SECRET --data-file=-
openssl rand -base64 32 | gcloud secrets create APP_KEY --data-file=-
```

作成済み secret の値を更新する場合は、次のように新しい version を追加します。

```bash
printf '%s' "${DB_PASSWORD}" | gcloud secrets versions add DB_PASSWORD --data-file=-
```

Cloud Run から secret と Cloud SQL を使えるように、実行サービスアカウントへ権限を付与します。

```bash
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUN_SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUN_SERVICE_ACCOUNT}" \
  --role="roles/cloudsql.client"
```

## 6. Docker image を build & push

Cloud Shell 上で作業している場合、ローカル PC 上の「起動済みコンテナ」を直接 Artifact Registry に送るのではなく、Cloud Shell にあるソースコードと `app/Dockerfile` から Cloud Build で Docker image を作り、その image を Artifact Registry に push します。

Artifact Registry に登録する image 名は、`<REGION>-docker.pkg.dev/<PROJECT_ID>/<REPOSITORY>/<IMAGE_NAME>:<TAG>` の形です。この手順では、前提値で定義した `${IMAGE}`、つまり `asia-northeast1-docker.pkg.dev/project-fa900d56-8f52-4a54-867/dockerexpress/dockerexpress:demo` に push します。

### 6-1. Cloud Shell にソースコードを用意する

Cloud Shell のターミナルで、まずこの README と `app/` ディレクトリがあるリポジトリの root に移動してください。

```bash
cd ~/docker-express
```

まだ Cloud Shell にソースコードがない場合は、次のどちらかで用意します。

- GitHub などに push 済みなら、Cloud Shell で `git clone <YOUR_REPOSITORY_URL>` します。
- ローカル PC にしかない場合は、Cloud Shell のメニューからファイルをアップロードするか、いったん GitHub などに push してから Cloud Shell で clone します。

リポジトリ root にいることを確認します。

```bash
pwd
test -f app/Dockerfile && test -f app/package.json && echo "OK: app build context exists"
```

### 6-2. 変数と Artifact Registry repository を確認する

```bash
gcloud config set project "${PROJECT_ID}"

printf 'IMAGE=%s\n' "${IMAGE}"

gcloud artifacts repositories describe "${REPOSITORY}" \
  --location="${REGION}"
```

`gcloud artifacts repositories describe` が `NOT_FOUND` になる場合は、「2. Artifact Registry を作成」を先に実行してください。

### 6-3. Cloud Build で build して Artifact Registry に push する

このリポジトリでは Dockerfile が `app/Dockerfile` にあり、Docker build context も `app/` です。そのため、repo root から次を実行します。

```bash
gcloud builds submit app --tag "${IMAGE}"
```

このコマンドは、`app/` ディレクトリを Cloud Build にアップロードし、`app/Dockerfile` を使って image を build し、成功した image を `${IMAGE}` として Artifact Registry に push します。ローカル PC の Docker image や起動中コンテナは使いません。

### 6-4. push できたことを確認する

```bash
gcloud artifacts docker images list \
  "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}"

gcloud artifacts docker tags list \
  "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE}"
```

`demo` tag が表示されれば、Cloud Run に渡す image の準備は完了です。

### 6-5. 間違った branch で build & push した場合

Artifact Registry の Docker tag は、repository で immutable tag を有効化していない限り、同じ tag を別の image digest に付け替えられます。今回の `${IMAGE}` は `:demo` tag なので、main branch で誤って push しても、通常は正しい branch に切り替えて同じ `gcloud builds submit app --tag "${IMAGE}"` を再実行すれば `demo` tag が正しい image を指すようになります。先に削除する必要はありません。

```bash
git switch codex/find-recommended-google-cloud-resources
git branch --show-current
git log -1 --oneline

gcloud builds submit app --tag "${IMAGE}"

gcloud artifacts docker tags list \
  "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE}"
```

その後、Cloud Run は image tag ではなく deploy 時点の image digest で revision を作るため、「7. Cloud Run にデプロイ」の `gcloud run deploy` をもう一度実行して、新しい revision を作成してください。

間違って push した image をどうしても削除したい場合は、削除対象を取り違えないように digest を確認してから削除します。正しい branch で再 push した後に `${IMAGE}` を削除すると、今度は正しい `demo` tag 側を消してしまう可能性があるため注意してください。

```bash
gcloud artifacts docker images list \
  "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE}" \
  --include-tags

# 削除対象の DIGEST を確認してから実行します。
gcloud artifacts docker images delete \
  "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE}@sha256:<DIGEST>" \
  --quiet
```

### 6-6. `storage.objects.get` 権限エラーが出た場合

`gcloud builds submit` は、まず source archive を Cloud Build 用の Cloud Storage bucket に置き、Cloud Build の実行サービスアカウントがその archive を読んで build します。次のようなエラーが出る場合、Cloud Build の実行サービスアカウントに source archive を読む権限が足りません。

```text
does not have storage.objects.get access to the Google Cloud Storage object
```

最近の project では、Cloud Build が legacy Cloud Build service account ではなく Compute Engine default service account (`<PROJECT_NUMBER>-compute@developer.gserviceaccount.com`) で実行されることがあります。エラーメッセージに `720570741774-compute@developer.gserviceaccount.com` のような service account が出ている場合は、次を実行してから `gcloud builds submit app --tag "${IMAGE}"` を再実行してください。

```bash
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
BUILD_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
CLOUDBUILD_BUCKET="${PROJECT_ID}_cloudbuild"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${BUILD_SERVICE_ACCOUNT}" \
  --role="roles/cloudbuild.builds.builder"

gcloud storage buckets add-iam-policy-binding "gs://${CLOUDBUILD_BUCKET}" \
  --member="serviceAccount:${BUILD_SERVICE_ACCOUNT}" \
  --role="roles/storage.objectViewer"
```

### 6-7. Artifact Registry への push 権限エラーが出た場合

Source archive の読み取りは通ったが、Artifact Registry への push で `Permission denied` や `denied: Permission` のようなエラーになる場合は、同じ build 実行サービスアカウントに Artifact Registry writer を付与してから再実行してください。

```bash
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
BUILD_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud artifacts repositories add-iam-policy-binding "${REPOSITORY}" \
  --location="${REGION}" \
  --member="serviceAccount:${BUILD_SERVICE_ACCOUNT}" \
  --role="roles/artifactregistry.writer"
```

エラーに `${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com` のような legacy Cloud Build service account が表示されている場合は、上の `BUILD_SERVICE_ACCOUNT` をそのメールアドレスに置き換えてください。

## 7. Cloud Run にデプロイ

```bash
gcloud run deploy "${SERVICE}" \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --add-cloudsql-instances "${CONNECTION_NAME}" \
  --set-env-vars "NODE_ENV=production,PORT=3000,DB_NAME=${DATABASE},DB_USER=${DB_USER},DB_DIALECT=mysql,TZ=Asia/Tokyo,DB_SOCKET_PATH=/cloudsql/${CONNECTION_NAME},GCS_BUCKET_NAME=${BUCKET},GCS_UPLOAD_PREFIX=uploads,UPLOAD_MAX_BYTES=5242880" \
  --set-secrets "DB_PASSWORD=DB_PASSWORD:latest,SESSION_SECRET=SESSION_SECRET:latest,APP_KEY=APP_KEY:latest" \
  --min-instances 0 \
  --max-instances 1
```

## 8. migration / seed を Cloud Run Jobs で実行

migration job を作成して実行します。

```bash
gcloud run jobs create dockerexpress-migrate \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --add-cloudsql-instances "${CONNECTION_NAME}" \
  --set-env-vars "NODE_ENV=production,DB_NAME=${DATABASE},DB_USER=${DB_USER},DB_DIALECT=mysql,TZ=Asia/Tokyo,DB_SOCKET_PATH=/cloudsql/${CONNECTION_NAME},GCS_BUCKET_NAME=${BUCKET},GCS_UPLOAD_PREFIX=uploads,UPLOAD_MAX_BYTES=5242880" \
  --set-secrets "DB_PASSWORD=DB_PASSWORD:latest,SESSION_SECRET=SESSION_SECRET:latest,APP_KEY=APP_KEY:latest" \
  --command npm \
  --args run,migrate

gcloud run jobs execute dockerexpress-migrate \
  --region "${REGION}" \
  --wait
```

seed job も同じ image で作成できます。

```bash
gcloud run jobs create dockerexpress-seed \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --add-cloudsql-instances "${CONNECTION_NAME}" \
  --set-env-vars "NODE_ENV=production,DB_NAME=${DATABASE},DB_USER=${DB_USER},DB_DIALECT=mysql,TZ=Asia/Tokyo,DB_SOCKET_PATH=/cloudsql/${CONNECTION_NAME},GCS_BUCKET_NAME=${BUCKET},GCS_UPLOAD_PREFIX=uploads,UPLOAD_MAX_BYTES=5242880" \
  --set-secrets "DB_PASSWORD=DB_PASSWORD:latest,SESSION_SECRET=SESSION_SECRET:latest,APP_KEY=APP_KEY:latest" \
  --command npm \
  --args run,seed

gcloud run jobs execute dockerexpress-seed \
  --region "${REGION}" \
  --wait
```

## 9. 発表後の後片付け

Cloud SQL は起動中に費用が発生しやすいので、勉強会後は削除または停止してください。完全に不要ならプロジェクトごと削除するのが簡単です。

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
