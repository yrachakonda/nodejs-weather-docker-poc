variable "domain_name" { type = string }
resource "aws_acm_certificate" "this" {
  domain_name       = var.domain_name
  validation_method = "DNS"
}
output "certificate_arn" { value = aws_acm_certificate.this.arn }
