data "google_project" "current" {
  project_id = var.project_id
}

locals {
  bucket_name           = coalesce(var.bucket_name, "${var.project_id}-dockerexpress-uploads")
  image                 = "${var.region}-docker.pkg.dev/${var.project_id}/${var.repository_id}/${var.service_name}:${var.image_tag}"
  db_connection_name    = "${var.project_id}:${var.region}:${var.cloud_sql_instance_name}"
  uploads_base_url      = "https://storage.googleapis.com/${local.bucket_name}/uploads"
  default_ogp_image_url = var.default_ogp_image_url != "" ? var.default_ogp_image_url : "https://storage.googleapis.com/${local.bucket_name}/images/common/ogp.png"

  app_env = {
    NODE_ENV              = "production"
    DB_NAME               = var.database_name
    DB_USER               = var.database_user
    DB_DIALECT            = "mysql"
    TZ                    = "Asia/Tokyo"
    DB_SOCKET_PATH        = "/cloudsql/${local.db_connection_name}"
    GCS_BUCKET_NAME       = local.bucket_name
    GCS_UPLOAD_PREFIX     = "uploads"
    UPLOADS_BASE_URL      = local.uploads_base_url
    SITE_HOST             = var.site_host
    DEFAULT_OGP_IMAGE_URL = local.default_ogp_image_url
    BUILD_PUSH_COUNT      = var.build_push_count
    UPLOAD_MAX_BYTES      = tostring(var.upload_max_bytes)
  }

  secret_env = {
    DB_PASSWORD    = google_secret_manager_secret.db_password.secret_id
    SESSION_SECRET = google_secret_manager_secret.session_secret.secret_id
    APP_KEY        = google_secret_manager_secret.app_key.secret_id
  }
}

resource "google_project_service" "required" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com",
  ])

  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

resource "random_password" "root" {
  length  = 24
  special = false
}

resource "random_password" "database" {
  length  = 24
  special = false
}

resource "random_password" "session_secret" {
  length  = 32
  special = false
}

resource "random_password" "app_key" {
  length  = 32
  special = false
}

resource "google_service_account" "run" {
  account_id   = "${var.service_name}-run"
  display_name = "${var.service_name} Cloud Run runtime"

  depends_on = [google_project_service.required]
}

resource "google_artifact_registry_repository" "app" {
  repository_id = var.repository_id
  description   = "Docker Express images"
  format        = "DOCKER"
  location      = var.region

  depends_on = [google_project_service.required]
}

resource "google_sql_database_instance" "mysql" {
  name             = var.cloud_sql_instance_name
  database_version = "MYSQL_8_4"
  region           = var.region
  root_password    = coalesce(var.root_password, random_password.root.result)

  settings {
    tier              = "db-f1-micro"
    edition           = "ENTERPRISE"
    availability_type = "ZONAL"
    disk_size         = 10
    disk_type         = "PD_SSD"
  }

  deletion_protection = true

  depends_on = [google_project_service.required]
}

resource "google_sql_database" "app" {
  name     = var.database_name
  instance = google_sql_database_instance.mysql.name
}

resource "google_sql_user" "app" {
  name     = var.database_user
  instance = google_sql_database_instance.mysql.name
  password = coalesce(var.database_password, random_password.database.result)
}

resource "google_storage_bucket" "uploads" {
  name                        = local.bucket_name
  location                    = var.region
  uniform_bucket_level_access = true

  depends_on = [google_project_service.required]
}

resource "google_storage_bucket_iam_member" "run_object_admin" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.run.email}"
}

resource "google_storage_bucket_iam_member" "public_viewer" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "DB_PASSWORD"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = coalesce(var.database_password, random_password.database.result)
}

resource "google_secret_manager_secret" "session_secret" {
  secret_id = "SESSION_SECRET"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "session_secret" {
  secret      = google_secret_manager_secret.session_secret.id
  secret_data = random_password.session_secret.result
}

resource "google_secret_manager_secret" "app_key" {
  secret_id = "APP_KEY"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "app_key" {
  secret      = google_secret_manager_secret.app_key.id
  secret_data = random_password.app_key.result
}

resource "google_project_iam_member" "run_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.run.email}"
}

resource "google_project_iam_member" "run_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.run.email}"
}

resource "google_artifact_registry_repository_iam_member" "cloud_build_writer" {
  repository = google_artifact_registry_repository.app.name
  location   = google_artifact_registry_repository.app.location
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
}

resource "google_artifact_registry_repository_iam_member" "compute_cloud_build_writer" {
  repository = google_artifact_registry_repository.app.name
  location   = google_artifact_registry_repository.app.location
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

resource "google_cloud_run_v2_service" "app" {
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.run.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.mysql.connection_name]
      }
    }

    containers {
      image = local.image
      ports {
        container_port = 3000
      }

      dynamic "env" {
        for_each = local.app_env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = local.secret_env
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }
  }

  depends_on = [
    google_artifact_registry_repository.app,
    google_project_iam_member.run_cloudsql_client,
    google_project_iam_member.run_secret_accessor,
    google_secret_manager_secret_version.db_password,
    google_secret_manager_secret_version.session_secret,
    google_secret_manager_secret_version.app_key,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  project  = var.project_id
  location = google_cloud_run_v2_service.app.location
  name  = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

module "migrate_job" {
  source = "./modules/cloud-run-job"

  name            = "${var.service_name}-migrate"
  region          = var.region
  image           = local.image
  service_account = google_service_account.run.email
  command         = ["npm"]
  args            = ["run", "migrate"]
  env             = local.app_env
  secret_env      = local.secret_env
  cloud_sql_instances = [
    google_sql_database_instance.mysql.connection_name,
  ]

  depends_on = [google_cloud_run_v2_service.app]
}

module "seed_job" {
  source = "./modules/cloud-run-job"

  name            = "${var.service_name}-seed"
  region          = var.region
  image           = local.image
  service_account = google_service_account.run.email
  command         = ["npm"]
  args            = ["run", "seed"]
  env             = local.app_env
  secret_env      = local.secret_env
  cloud_sql_instances = [
    google_sql_database_instance.mysql.connection_name,
  ]

  depends_on = [google_cloud_run_v2_service.app]
}
