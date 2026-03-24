variable "hosted_zone_id" {
  description = "Hosted zone ID where the application record is created."
  type        = string
}

variable "domain_name" {
  description = "Application hostname."
  type        = string
}

variable "alb_dns_name" {
  description = "DNS name of the application load balancer."
  type        = string
}

resource "aws_route53_record" "app" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "CNAME"
  ttl     = 300
  records = [var.alb_dns_name]
}
