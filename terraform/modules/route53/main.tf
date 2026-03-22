variable "zone_id" { type = string }
variable "name" { type = string }
variable "target" { type = string }
resource "aws_route53_record" "app" {
  zone_id = var.zone_id
  name    = var.name
  type    = "CNAME"
  ttl     = 60
  records = [var.target]
}
