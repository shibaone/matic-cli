variable "PROJECT_ID" {
  type    = string
}

variable "BOR_PERSISTENT_DISK_TYPE" {
  type    = string
  default = "pd-ssd"
}

variable "ERIGON_PERSISTENT_DISK_TYPE" {
  type    = string
  default = "pd-ssd"
}

variable "BOR_ARCHIVE_PERSISTENT_DISK_TYPE" {
  type    = string
  default = "pd-standard"
}

variable "ERIGON_ARCHIVE_PERSISTENT_DISK_TYPE" {
  type    = string
  default = "pd-standard"
}

variable "BOR_MACHINE_TYPE" {
  type    = string
  default = "t2a-standard-2"
}

variable "ERIGON_MACHINE_TYPE" {
  type    = string
  default = "t2a-standard-2"
}

variable "BOR_ARCHIVE_MACHINE_TYPE" {
  type    = string
  default = "t2a-standard-2"
}

variable "ERIGON_ARCHIVE_MACHINE_TYPE" {
  type    = string
  default = "t2a-standard-2"
}

variable "INSTANCE_IMAGE" {
  type    = string
  default = "ubuntu-2204-jammy-v20230302"
}

variable "GCP_REGION" {
  type    = string
  default = "us-central1"
}

variable "ZONE" {
  type    = string
  default = "us-central1-a"
}

variable "GCP_PUB_KEY_FILE" {
  type    = string
}

variable "SUBNET_CIDR_RANGE" {
  type = string
}

variable "FW_RULE_SUFFIX" {
  type = string
  default = "fw-rule"
}

variable "USER" {
  type = string
}
