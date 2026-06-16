# Terraform によるデプロイ手順

事前準備

- Google Cloud コンソールで新規プロジェクトを立ち上げておく
- 立ち上げたプロジェクトのプロジェクトIDを控えておく
- Cloud Shell 操作環境（★初心者にオススメ）<br>またはローカル操作環境（ Cloud SDK インストール & auth login 済みのターミナル）
- Terraform v1.6 以上の環境
  <br><br>

## デプロイ環境の準備（1. ~ 4.）

1. Terraform v1.6 以上の環境であることを確認する<br><sub>※ v1.6 未満だとデプロイまで進めない</sub>

   ```bash
   terraform -v
   ```

2. 操作対象となるデフォルトのプロジェクトを指定する

   ```bash
   # プロジェクトIDを xxxx 箇所に入れること
   gcloud config set project "xxxx"
   ```

3. ソースコードを用意する

   <sub># git clone でこのアプリのソースをダウンロードする</sub>

   ```bash
   git clone https://github.com/kazuyaTakahashi1988/docker-express.git
   ```

   <sub># このアプリのソースがある階層に移動する</sub>

   ```bash
   cd docker-express
   ```

   <sub># git switch で、このアプリの Google Cloud リリース用ブランチに切り替える</sub>

   ```bash
   git switch for-google-cloud
   ```

   <sub># terraform のソース群がある階層に移動する</sub>

   ```bash
   cd terraform
   ```

   <sub># 環境変数ファイル（サンプル用）をコピーする</sub>

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

4. コピーした環境変数ファイル `terraform.tfvars` を編集し、<br>(2.)と同様のプロジェクトIDを指定する

   ```bash
   vim terraform.tfvars
   # ファイル内 `project_id = "xxxx"` の
   #  xxxx 個所に、(2.)と同様のプロジェクトIDを指定する
   ```

<br>

## Terraform コマンドによるデプロイ手順（1. ~ 6.）

1. Terraform 初期化コマンド

   ```bash
   terraform init
   ```

2. Cloud Runを除いて、インフラストラクチャを作成するコマンド<br><sub>※ アプリケーションイメージが build & push されるまで Cloud Run はデプロイできないため</sub>

   ```bash
   terraform apply -var="deploy_cloud_run=false"
   ```

3. アプリケーションイメージを build & push するコマンド

   ```bash
   gcloud builds submit ../app \
      --gcs-source-staging-dir "$(terraform output -raw cloud_build_source_staging_dir)" \
      --tag "$(terraform output -raw image)"
   ```

4. Cloud Runを含めて、全てのインフラストラクチャを作成するコマンド

   ```bash
   terraform apply
   ```

5. migration / seed を実行するコマンド

   ```bash
   gcloud run jobs execute dockerexpress-migrate --region "$(terraform output -raw region 2>/dev/null || echo asia-northeast1)" --wait
   gcloud run jobs execute dockerexpress-seed --region "$(terraform output -raw region 2>/dev/null || echo asia-northeast1)" --wait
   ```

6. これにてリリース完了です。<br>以下のコマンドで公開URLを入手しブラウザで確認する

   ```bash
   terraform output cloud_run_url
   ```

   <br>

## Notes

- デプロイ成功後、再ビルドするための推奨ビルドコマンドを取得するコマンド

  ```bash
  terraform output -raw gcloud_builds_submit_command
  ```

- Cloud SQL では、誤ってデータベースが削除されるのを防ぐために deletion_protection = true が設定されています。環境を意図的に破棄する場合のみ、main.tf でこの値を false に設定してください。
- database_password、root_password、SESSION_SECRET、または APP_KEY が指定されていない場合、Terraform は値を自動生成し、アプリケーション シークレットを Secret Manager に保存します。
- アップロードされたアプリケーション オブジェクトは、イメージ URL の現在のアプリケーションの動作に合わせて、公開読み取り可能になります。
- gcloud builds submit は Terraform が管理する cloud_build_source_staging_dir バケットを使用するため、Cloud Build サービス アカウントは暗黙的なデフォルトの Cloud Build バケットに依存するのではなく、明示的に読み取りアクセス権を取得します。
