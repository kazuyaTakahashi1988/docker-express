output "artifact_registry_repository" {
  description = "Artifact Registry repository resource name."
  value       = google_artifact_registry_repository.app.name
}

output "image" {
  description = "Container image URI expected by Cloud Run."
  value       = local.image
}

output "cloud_run_url" {
  description = "Cloud Run service URL."
  value       = try(google_cloud_run_v2_service.app[0].uri, null)
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL connection name."
  value       = google_sql_database_instance.mysql.connection_name
}

output "uploads_bucket" {
  description = "Cloud Storage bucket for uploads."
  value       = google_storage_bucket.uploads.name
}

output "region" {
  description = "Google Cloud region."
  value       = var.region
}

output "cloud_build_source_staging_dir" {
  description = "Cloud Storage path for gcloud builds submit source staging."
  value       = local.cloud_build_source_staging_dir
}

output "gcloud_builds_submit_command" {
  description = "Recommended gcloud builds submit command that uses the Terraform-managed staging bucket."
  value       = "gcloud builds submit ../app --gcs-source-staging-dir ${local.cloud_build_source_staging_dir} --tag ${local.image}"
}
