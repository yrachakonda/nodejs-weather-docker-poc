variable "name" { type = string }
resource "aws_wafv2_web_acl" "this" {
  name  = var.name
  scope = "REGIONAL"
  default_action { allow {} }
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = var.name
    sampled_requests_enabled   = true
  }
}
