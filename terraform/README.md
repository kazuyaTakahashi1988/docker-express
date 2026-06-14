# Terraform for Docker Express on Google Cloud

This directory manages the Google Cloud resources used by the app:

- Cloud Run service for the Express container
- Cloud Run Jobs for migration and seed execution
- Cloud SQL for MySQL 8.4
- Artifact Registry Docker repository
- Secret Manager secrets
- Cloud Storage bucket for uploads
- IAM bindings and required Google Cloud APIs

## Prerequisites

1. Install Terraform `>= 1.6` and the Google Cloud CLI.
2. Authenticate with Google Cloud:

   ```bash
   gcloud auth application-default login
   gcloud config set project YOUR_PROJECT_ID
   gcloud services enable cloudresourcemanager.googleapis.com
   ```

3. Copy the sample variables file:

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

4. Edit `terraform.tfvars` and set `project_id`.

## Deploy

Initialize Terraform:

```bash
terraform init
```

Create the Artifact Registry repository first, because Cloud Run cannot deploy until the image exists:

```bash
terraform apply \
  -target=google_artifact_registry_repository.app \
  -target=google_artifact_registry_repository_iam_member.cloud_build_writer \
  -target=google_artifact_registry_repository_iam_member.compute_cloud_build_writer
```

Build and push the application image shown by the `image` output:

```bash
gcloud builds submit ../app --tag "$(terraform output -raw image)"
```

Apply again so Cloud Run can deploy the newly pushed image if the first apply ran before the image existed:

```bash
terraform apply
```

Run migrations and seed data when needed:

```bash
gcloud run jobs execute dockerexpress-migrate --region "$(terraform output -raw region 2>/dev/null || echo asia-northeast1)" --wait
gcloud run jobs execute dockerexpress-seed --region "$(terraform output -raw region 2>/dev/null || echo asia-northeast1)" --wait
```

The public application URL is available with:

```bash
terraform output cloud_run_url
```

## Notes

- Cloud SQL has `deletion_protection = true` to prevent accidental database deletion. Set it to `false` in `main.tf` only when intentionally destroying the environment.
- If `database_password`, `root_password`, `SESSION_SECRET`, or `APP_KEY` are not provided, Terraform generates values and stores application secrets in Secret Manager.
- Uploaded objects are publicly readable to match the current application behavior for image URLs.
