variable "project_id" {
  description = "Google Cloud project ID to deploy into."
  type        = string
}

variable "region" {
  description = "Google Cloud region for regional resources."
  type        = string
  default     = "asia-northeast1"
}

variable "service_name" {
  description = "Cloud Run service name and container image name."
  type        = string
  default     = "dockerexpress"
}

variable "repository_id" {
  description = "Artifact Registry Docker repository ID."
  type        = string
  default     = "dockerexpress"
}

variable "image_tag" {
  description = "Container image tag deployed to Cloud Run. Build/push this tag before applying Cloud Run resources."
  type        = string
  default     = "demo"
}

variable "cloud_sql_instance_name" {
  description = "Cloud SQL for MySQL instance name."
  type        = string
  default     = "dockerexpress-mysql"
}

variable "database_name" {
  description = "Application database name."
  type        = string
  default     = "express_db"
}

variable "database_user" {
  description = "Application database user."
  type        = string
  default     = "dockerexpress_user"
}

variable "database_password" {
  description = "Application database password. Leave null to generate one."
  type        = string
  default     = null
  sensitive   = true
}

variable "root_password" {
  description = "Cloud SQL root password. Leave null to generate one."
  type        = string
  default     = null
  sensitive   = true
}

variable "bucket_name" {
  description = "Cloud Storage bucket name for uploaded files. Leave null to use <project_id>-dockerexpress-uploads."
  type        = string
  default     = null
}

variable "cloud_build_source_bucket_name" {
  description = "Cloud Storage bucket name used by gcloud builds submit as a source staging bucket. Leave null to use <project_id>-dockerexpress-cloudbuild-source."
  type        = string
  default     = null
}

variable "build_submitter_members" {
  description = "Optional IAM members allowed to upload source archives to the Cloud Build staging bucket, for example user:alice@example.com or group:dev@example.com."
  type        = set(string)
  default     = []
}

variable "site_host" {
  description = "Public site URL used for metadata. Leave empty until the Cloud Run URL is known."
  type        = string
  default     = ""
}

variable "uploads_base_url" {
  description = "Base URL for uploaded files. Leave empty to derive https://storage.googleapis.com/<bucket_name>/uploads."
  type        = string
  default     = ""
}

variable "default_ogp_image_url" {
  description = "Default OGP image URL. Leave empty to derive a Cloud Storage URL."
  type        = string
  default     = ""
}

variable "build_push_count" {
  description = "Application-visible build/deploy marker."
  type        = string
  default     = "terraform"
}

variable "upload_max_bytes" {
  description = "Maximum upload size in bytes."
  type        = number
  default     = 5242880
}

variable "min_instances" {
  description = "Minimum Cloud Run instances."
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum Cloud Run instances."
  type        = number
  default     = 1
}

variable "deploy_cloud_run" {
  description = "Whether to create Cloud Run service and jobs. Set false for the first apply before the image is pushed."
  type        = bool
  default     = true
}
