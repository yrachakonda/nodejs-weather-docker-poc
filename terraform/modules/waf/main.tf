variable "project_name" { type = string }
resource "aws_wafv2_web_acl" "this" {
  name  = "${var.project_name}-acl"
  scope = "REGIONAL"
  default_action { allow {} }
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-waf"
    sampled_requests_enabled   = true
  }
}
output "web_acl_arn" { value = aws_wafv2_web_acl.this.arn }
