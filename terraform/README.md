# Terraform for Docker Express on Google Cloud

This directory manages the Google Cloud resources used by the app:

- Cloud Run service for the Express container
- Cloud Run Jobs for migration and seed execution
- Cloud SQL for MySQL 8.4
- Artifact Registry Docker repository
- Secret Manager secrets
- Cloud Storage bucket for uploads
- IAM bindings and required Google Cloud APIs, including Cloud Resource Manager and Service Usage

## Prerequisites

1. Install Terraform `>= 1.6` and the Google Cloud CLI.
2. Authenticate with Google Cloud and enable the bootstrap APIs required before Terraform can manage project services/IAM:

   ```bash
   gcloud auth application-default login
   gcloud config set project YOUR_PROJECT_ID
   gcloud services enable serviceusage.googleapis.com cloudresourcemanager.googleapis.com
   ```

3. Copy the sample variables file:

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

4. Edit `terraform.tfvars` and set `project_id`. If the principal running `gcloud builds submit` is not a project owner/editor, also set `build_submitter_members` so it can upload the source archive to the Terraform-managed staging bucket.

## Deploy

Initialize Terraform:

```bash
terraform init
```

Create the infrastructure except Cloud Run first, because Cloud Run cannot deploy until the image exists:

```bash
terraform apply -var="deploy_cloud_run=false"
```

Build and push the application image shown by the `image` output. Do not use `gcloud builds submit ../app --tag "$(terraform output -raw image)"` here, because that falls back to the implicit `${PROJECT_ID}_cloudbuild` bucket and can reproduce `storage.objects.get` errors on the uploaded source archive:

```bash
gcloud builds submit ../app \
  --gcs-source-staging-dir "$(terraform output -raw cloud_build_source_staging_dir)" \
  --tag "$(terraform output -raw image)"
```

Apply again with the default `deploy_cloud_run=true` so Cloud Run and the jobs deploy the newly pushed image:

```bash
terraform apply
```

Run migrations and seed data when needed:

```bash
gcloud run jobs execute dockerexpress-migrate --region "$(terraform output -raw region 2>/dev/null || echo asia-northeast1)" --wait
gcloud run jobs execute dockerexpress-seed --region "$(terraform output -raw region 2>/dev/null || echo asia-northeast1)" --wait
```

You can also print the recommended build command with:

```bash
terraform output -raw gcloud_builds_submit_command
```

The public application URL is available with:

```bash
terraform output cloud_run_url
```

## Notes

- Cloud SQL has `deletion_protection = true` to prevent accidental database deletion. Set it to `false` in `main.tf` only when intentionally destroying the environment.
- If `database_password`, `root_password`, `SESSION_SECRET`, or `APP_KEY` are not provided, Terraform generates values and stores application secrets in Secret Manager.
- Uploaded application objects are publicly readable to match the current application behavior for image URLs.
- `gcloud builds submit` uses the Terraform-managed `cloud_build_source_staging_dir` bucket so the Cloud Build service account receives read access explicitly instead of relying on the implicit default Cloud Build bucket.


## Troubleshooting Cloud Build source bucket permissions

If you see an error like `does not have storage.objects.get access` for `gs://<PROJECT_ID>_cloudbuild/source/...`, you are still using Cloud Build's implicit default source bucket. Re-run the build with the documented `--gcs-source-staging-dir "$(terraform output -raw cloud_build_source_staging_dir)"` option so Cloud Build reads from the Terraform-managed bucket that has explicit IAM bindings.
