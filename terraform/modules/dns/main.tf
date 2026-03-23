variable "hosted_zone_id" { type = string }
variable "domain_name" { type = string }
variable "alb_dns_name" { type = string }
resource "aws_route53_record" "app" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "CNAME"
  ttl     = 300
  records = [var.alb_dns_name]
}
