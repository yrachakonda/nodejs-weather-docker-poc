locals {
  api_name              = "${var.project_name}-api"
  access_log_group_name = "/aws/apigateway/${local.api_name}-${var.stage_name}"
}

data "aws_lb" "api_nlb" {
  name = var.nlb_name
}

resource "aws_api_gateway_rest_api" "this" {
  name                         = local.api_name
  description                  = "Public API edge for ${var.project_name}"
  disable_execute_api_endpoint = true

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = var.tags
}

resource "aws_api_gateway_resource" "proxy" {
  parent_id   = aws_api_gateway_rest_api.this.root_resource_id
  path_part   = "{proxy+}"
  rest_api_id = aws_api_gateway_rest_api.this.id
}

# This edge is intentionally internet-reachable behind WAF and forwards to an
# application that already enforces its own session and API-key authorization.
resource "aws_api_gateway_method" "proxy" {
  #tfsec:ignore:aws-api-gateway-no-public-access
  authorization = "NONE"
  http_method   = "ANY"
  resource_id   = aws_api_gateway_resource.proxy.id
  rest_api_id   = aws_api_gateway_rest_api.this.id

  request_parameters = {
    "method.request.path.proxy" = true
  }
}

resource "aws_api_gateway_vpc_link" "this" {
  name        = local.api_name
  description = "VPC Link from API Gateway to the internal API NLB"
  target_arns = [data.aws_lb.api_nlb.arn]

  tags = var.tags
}

resource "aws_api_gateway_integration" "proxy" {
  http_method             = aws_api_gateway_method.proxy.http_method
  integration_http_method = "ANY"
  connection_id           = aws_api_gateway_vpc_link.this.id
  connection_type         = "VPC_LINK"
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.proxy.id
  type                    = "HTTP_PROXY"
  uri                     = "http://${data.aws_lb.api_nlb.dns_name}/{proxy}"

  request_parameters = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }
}

resource "aws_api_gateway_deployment" "this" {
  rest_api_id = aws_api_gateway_rest_api.this.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.proxy.id,
      aws_api_gateway_integration.proxy.id,
      aws_api_gateway_vpc_link.this.id
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.proxy
  ]
}

data "aws_iam_policy_document" "api_gateway_cloudwatch_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      identifiers = ["apigateway.amazonaws.com"]
      type        = "Service"
    }
  }
}

resource "aws_iam_role" "api_gateway_cloudwatch" {
  name               = "${local.api_name}-cloudwatch"
  assume_role_policy = data.aws_iam_policy_document.api_gateway_cloudwatch_assume_role.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
  role       = aws_iam_role.api_gateway_cloudwatch.name
}

resource "aws_api_gateway_account" "this" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn

  depends_on = [
    aws_iam_role_policy_attachment.api_gateway_cloudwatch
  ]
}

resource "aws_cloudwatch_log_group" "api_gateway_access" {
  name              = local.access_log_group_name
  kms_key_id        = var.kms_key_arn
  retention_in_days = var.access_log_retention_days

  tags = var.tags
}

resource "aws_api_gateway_stage" "this" {
  depends_on = [
    aws_api_gateway_account.this,
    aws_cloudwatch_log_group.api_gateway_access
  ]

  deployment_id = aws_api_gateway_deployment.this.id
  rest_api_id   = aws_api_gateway_rest_api.this.id
  stage_name    = var.stage_name

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_access.arn
    format = jsonencode({
      ip                = "$context.identity.sourceIp"
      requestId         = "$context.requestId"
      httpMethod        = "$context.httpMethod"
      routeKey          = "$context.resourcePath"
      status            = "$context.status"
      protocol          = "$context.protocol"
      responseLength    = "$context.responseLength"
      integrationStatus = "$context.integration.status"
      userAgent         = "$context.identity.userAgent"
    })
  }

  xray_tracing_enabled = true

  tags = var.tags
}

resource "aws_wafv2_web_acl_association" "this" {
  resource_arn = aws_api_gateway_stage.this.arn
  web_acl_arn  = var.waf_acl_arn
}

resource "aws_api_gateway_domain_name" "this" {
  domain_name              = var.api_domain_name
  regional_certificate_arn = var.certificate_arn
  security_policy          = "TLS_1_2"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = var.tags
}

resource "aws_api_gateway_base_path_mapping" "this" {
  api_id      = aws_api_gateway_rest_api.this.id
  domain_name = aws_api_gateway_domain_name.this.domain_name
  stage_name  = aws_api_gateway_stage.this.stage_name
}

resource "aws_route53_record" "this" {
  zone_id = var.hosted_zone_id
  name    = var.api_domain_name
  type    = "A"

  alias {
    evaluate_target_health = false
    name                   = aws_api_gateway_domain_name.this.regional_domain_name
    zone_id                = aws_api_gateway_domain_name.this.regional_zone_id
  }
}
