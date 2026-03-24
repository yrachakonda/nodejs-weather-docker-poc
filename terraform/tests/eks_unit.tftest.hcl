mock_provider "aws" {
  override_during = plan

  mock_resource "aws_eks_cluster" {
    defaults = {
      arn = "arn:aws:eks:us-east-1:123456789012:cluster/weather-sim-test"
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

  mock_resource "aws_iam_openid_connect_provider" {
    defaults = {
      arn = "arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/test"
      url = "https://oidc.eks.us-east-1.amazonaws.com/id/test"
    }
  }
}

mock_provider "tls" {
  override_during = plan
}

override_data {
  target = data.aws_iam_policy_document.cluster_assume_role
  values = {
    json = "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Action\":\"sts:AssumeRole\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"eks.amazonaws.com\"}}]}"
  }
}

override_data {
  target = data.aws_iam_policy_document.node_assume_role
  values = {
    json = "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Action\":\"sts:AssumeRole\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"ec2.amazonaws.com\"}}]}"
  }
}

override_data {
  target = data.tls_certificate.this
  values = {
    certificates = [
      {
        sha1_fingerprint = "9e99a48a9960b14926bb7f3b02e22da0ecd4e017"
      }
    ]
  }
}

run "eks_cluster_and_nodes_use_expected_settings" {
  command = plan

  module {
    source = "./modules/eks"
  }

  variables {
    cluster_name       = "weather-sim-test"
    desired_node_count = 2
    private_subnet_ids = ["subnet-private-a", "subnet-private-b"]
    project_name       = "weather-sim"
    public_subnet_ids  = ["subnet-public-a", "subnet-public-b"]
    tags = {
      Environment = "test"
      Project     = "weather-sim"
    }
    vpc_id = "vpc-12345678"
  }

  assert {
    condition     = aws_eks_cluster.this.name == "weather-sim-test"
    error_message = "The EKS cluster should use the requested cluster name."
  }

  assert {
    condition     = aws_eks_cluster.this.version == "1.31"
    error_message = "The EKS cluster should target Kubernetes version 1.31."
  }

  assert {
    condition     = length(aws_eks_cluster.this.vpc_config[0].subnet_ids) == 4
    error_message = "The control plane must span both public and private subnets."
  }

  assert {
    condition     = aws_eks_node_group.this.scaling_config[0].desired_size == 2
    error_message = "The node group should honor the requested desired node count."
  }

  assert {
    condition     = aws_eks_node_group.this.scaling_config[0].min_size == 2
    error_message = "The node group should keep at least two nodes for HA."
  }

  assert {
    condition     = aws_eks_node_group.this.instance_types[0] == "t3.medium"
    error_message = "The managed node group should use the expected instance type."
  }

  assert {
    condition     = aws_iam_openid_connect_provider.this.url == "https://oidc.eks.us-east-1.amazonaws.com/id/test"
    error_message = "The module should expose the expected OIDC provider URL for IRSA."
  }
}
