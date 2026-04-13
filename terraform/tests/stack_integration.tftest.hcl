mock_provider "aws" {
  override_during = plan

  mock_data "aws_availability_zones" {
    defaults = {
      names = ["us-east-1a", "us-east-1b"]
    }
  }

  mock_data "aws_eks_cluster_auth" {
    defaults = {
      token = "test-token"
    }
  }

  mock_data "aws_caller_identity" {
    defaults = {
      account_id = "123456789012"
    }
  }

  mock_data "aws_region" {
    defaults = {
      name = "us-east-1"
    }
  }

  mock_resource "aws_eks_cluster" {
    defaults = {
      arn = "arn:aws:eks:us-east-1:123456789012:cluster/weather-sim-poc"
      certificate_authority = [
        {
          data = "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t"
        }
      ]
      endpoint = "https://example.eks.amazonaws.com"
      identity = [
        {
          oidc = [
            {
              issuer = "https://oidc.eks.us-east-1.amazonaws.com/id/test"
            }
          ]
        }
      ]
      platform_version = "eks.1"
      status           = "ACTIVE"
      version          = "1.31"
    }
  }

  mock_resource "aws_kms_key" {
    defaults = {
      arn    = "arn:aws:kms:us-east-1:123456789012:key/test"
      key_id = "test"
    }
  }

  mock_resource "aws_iam_openid_connect_provider" {
    defaults = {
      arn = "arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/test"
      url = "https://oidc.eks.us-east-1.amazonaws.com/id/test"
    }
  }

  mock_resource "aws_acm_certificate" {
    defaults = {
      arn               = "arn:aws:acm:us-east-1:123456789012:certificate/test"
      domain_name       = "weather-poc.example.com"
      validation_method = "DNS"
      domain_validation_options = [
        {
          domain_name           = "weather-poc.example.com"
          resource_record_name  = "_acm.weather-poc.example.com"
          resource_record_type  = "CNAME"
          resource_record_value = "_token.acm-validations.aws"
        }
      ]
    }
  }

  mock_resource "aws_wafv2_web_acl" {
    defaults = {
      arn   = "arn:aws:wafv2:us-east-1:123456789012:regional/webacl/weather-sim-poc-acl/test"
      name  = "weather-sim-poc-acl"
      scope = "REGIONAL"
    }
  }
}

mock_provider "helm" {
  override_during = plan
}

mock_provider "kubernetes" {
  override_during = plan
}

mock_provider "tls" {
  override_during = plan
}

override_data {
  target = module.eks.data.aws_iam_policy_document.cluster_assume_role
  values = {
    json = "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Action\":\"sts:AssumeRole\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"eks.amazonaws.com\"}}]}"
  }
}

override_data {
  target = module.eks.data.aws_iam_policy_document.node_assume_role
  values = {
    json = "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Action\":\"sts:AssumeRole\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"ec2.amazonaws.com\"}}]}"
  }
}

override_data {
  target = data.aws_iam_policy_document.aws_load_balancer_controller_assume_role
  values = {
    json = "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Action\":\"sts:AssumeRoleWithWebIdentity\",\"Effect\":\"Allow\",\"Principal\":{\"Federated\":\"arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/test\"}}]}"
  }
}

override_data {
  target = module.eks.data.tls_certificate.this
  values = {
    certificates = [
      {
        sha1_fingerprint = "9e99a48a9960b14926bb7f3b02e22da0ecd4e017"
      }
    ]
  }
}

override_data {
  target = data.kubernetes_ingress_v1.weather_sim
  values = {
    status = [
      {
        load_balancer = [
          {
            ingress = [
              {
                hostname = "k8s-weather-sim-123456.us-east-1.elb.amazonaws.com"
              }
            ]
          }
        ]
      }
    ]
  }
}

override_resource {
  override_during = plan
  target          = module.api_edge.aws_api_gateway_vpc_link.this
  values = {
    id = "vpclink-123456"
  }
}

override_resource {
  override_during = plan
  target          = module.api_edge.aws_api_gateway_stage.this
  values = {
    arn = "arn:aws:apigateway:us-east-1::/restapis/test-api/stages/prod"
  }
}

override_resource {
  override_during = plan
  target          = module.api_edge.aws_wafv2_web_acl_association.this
  values = {
    resource_arn = "arn:aws:apigateway:us-east-1::/restapis/test-api/stages/prod"
  }
}

run "root_stack_wires_networking_ingress_and_waf" {
  command = plan

  variables {
    aws_region           = "us-east-1"
    desired_node_count   = 2
    domain_name          = "weather-poc.example.com"
    environment          = "poc"
    hosted_zone_id       = "Z1234567890"
    kubernetes_namespace = "weather-sim"
    project_name         = "weather-sim"
    vpc_cidr             = "10.0.0.0/16"
  }

  assert {
    condition     = length(module.networking.public_subnet_ids) == 2 && length(module.networking.private_subnet_ids) == 2
    error_message = "The root stack must compose two public and two private subnets."
  }

  assert {
    condition     = module.eks.cluster_name == "weather-sim-poc"
    error_message = "The root stack must name the EKS cluster from project and environment."
  }

  assert {
    condition     = module.acm.certificate_arn != null
    error_message = "The root stack must produce an ACM certificate ARN for ingress TLS."
  }

  assert {
    condition     = module.logging.kms_key_arn == "arn:aws:kms:us-east-1:123456789012:key/test"
    error_message = "The root stack must expose the shared telemetry KMS key."
  }

  assert {
    condition     = module.networking.vpc_flow_log_group_name == "/weather-sim-poc/networking/vpc-flow-logs"
    error_message = "The root stack must enable VPC flow logs in the expected log group."
  }

  assert {
    condition     = module.waf.web_acl_arn != null
    error_message = "The root stack must produce a WAF ACL ARN for ALB protection."
  }

  assert {
    condition     = kubernetes_namespace_v1.app.metadata[0].name == "weather-sim"
    error_message = "The application namespace should match the requested Kubernetes namespace."
  }

  assert {
    condition     = kubernetes_namespace_v1.observability.metadata[0].name == "observability"
    error_message = "The observability namespace should use the dedicated default namespace."
  }

  assert {
    condition     = helm_release.aws_load_balancer_controller.chart == "aws-load-balancer-controller"
    error_message = "The root stack must install the AWS Load Balancer Controller chart."
  }

  assert {
    condition     = helm_release.weather_sim.name == "weather-sim" && helm_release.weather_sim.namespace == "weather-sim"
    error_message = "The application Helm release should deploy the weather chart into the application namespace."
  }

  assert {
    condition     = module.observability.kafka_topic_name == "weather-sim.logs"
    error_message = "The observability module should publish the expected log topic name."
  }

  assert {
    condition     = module.observability.cloudwatch_log_group_name == "/weather-sim-poc/observability/application"
    error_message = "The observability module should expose the expected CloudWatch log group for Fluent Bit."
  }

  assert {
    condition     = module.observability.kibana_service_name == "weather-sim-kibana-kb-http.observability.svc.cluster.local"
    error_message = "The observability module should expose the internal Kibana service name."
  }

  assert {
    condition     = aws_iam_policy.aws_load_balancer_controller.name == "weather-sim-poc-aws-load-balancer-controller"
    error_message = "The root stack must provision the IAM policy for the AWS Load Balancer Controller."
  }
}

run "root_stack_exposes_api_gateway_for_public_api_traffic" {
  command = plan

  variables {
    aws_region           = "us-east-1"
    desired_node_count   = 2
    domain_name          = "weather-poc.example.com"
    environment          = "poc"
    hosted_zone_id       = "Z1234567890"
    kubernetes_namespace = "weather-sim"
    project_name         = "weather-sim"
    vpc_cidr             = "10.0.0.0/16"
  }

  assert {
    condition     = startswith(output.api_gateway_invoke_url, "https://")
    error_message = "The root stack must expose an HTTPS API Gateway invoke URL."
  }

  assert {
    condition     = output.api_gateway_vpc_link_id != null && output.api_gateway_vpc_link_id != ""
    error_message = "The root stack must expose the VPC Link used for private API integration."
  }

  assert {
    condition     = output.api_gateway_integration_type == "HTTP_PROXY"
    error_message = "The API Gateway integration must be an HTTP proxy integration."
  }

  assert {
    condition     = output.api_gateway_integration_connection_type == "VPC_LINK"
    error_message = "The API Gateway integration must use a VPC Link."
  }

  assert {
    condition     = startswith(output.api_gateway_stage_arn, "arn:aws:apigateway:")
    error_message = "The API Gateway stage ARN must be exposed for downstream WAF association checks."
  }

  assert {
    condition     = output.api_gateway_access_log_group_name == "/aws/apigateway/weather-sim-poc-api-prod"
    error_message = "The API Gateway stage must publish access logs to the expected CloudWatch log group."
  }

  assert {
    condition     = output.api_gateway_xray_tracing_enabled == true
    error_message = "The API Gateway stage must enable X-Ray tracing."
  }

  assert {
    condition     = output.api_gateway_waf_association_resource_arn == output.api_gateway_stage_arn
    error_message = "The WAF association must target the API Gateway stage ARN."
  }

  assert {
    condition     = output.api_service_load_balancer_scheme == "internal"
    error_message = "The API workload must be published through an internal load balancer."
  }

  assert {
    condition     = output.api_service_load_balancer_target_type == "ip"
    error_message = "The API load balancer must use IP targets for the EKS pods."
  }

  assert {
    condition     = output.api_service_healthcheck_port == "8080"
    error_message = "The API load balancer health check port must match the backend API container port."
  }

  assert {
    condition     = output.api_service_healthcheck_path == "/api/v1/system/health"
    error_message = "The API load balancer health check path must target the API health endpoint."
  }
}
