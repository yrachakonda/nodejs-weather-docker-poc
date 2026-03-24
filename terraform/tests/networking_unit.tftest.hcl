mock_provider "aws" {
  override_during = plan

  mock_data "aws_availability_zones" {
    defaults = {
      names = ["us-east-1a", "us-east-1b"]
    }
  }
}

run "networking_builds_expected_subnets" {
  command = plan

  module {
    source = "./modules/networking"
  }

  variables {
    cluster_name = "weather-sim-test"
    name         = "weather-sim-test"
    tags = {
      Environment = "test"
      Project     = "weather-sim"
    }
    vpc_cidr = "10.0.0.0/16"
  }

  assert {
    condition     = aws_vpc.this.cidr_block == "10.0.0.0/16"
    error_message = "The networking module must create the requested /16 VPC CIDR."
  }

  assert {
    condition     = length(values(aws_subnet.public)) == 2
    error_message = "The networking module must create two public subnets."
  }

  assert {
    condition     = length(values(aws_subnet.private)) == 2
    error_message = "The networking module must create two private subnets."
  }

  assert {
    condition     = alltrue([for subnet in values(aws_subnet.public) : subnet.map_public_ip_on_launch])
    error_message = "Public subnets must assign public IPs on launch."
  }

  assert {
    condition     = alltrue([for subnet in values(aws_subnet.public) : subnet.tags["kubernetes.io/role/elb"] == "1"])
    error_message = "Public subnets must be tagged for internet-facing load balancers."
  }

  assert {
    condition     = alltrue([for subnet in values(aws_subnet.private) : subnet.tags["kubernetes.io/role/internal-elb"] == "1"])
    error_message = "Private subnets must be tagged for internal load balancers."
  }

  assert {
    condition     = toset([for subnet in values(aws_subnet.public) : subnet.cidr_block]) == toset(["10.0.0.0/20", "10.0.16.0/20"])
    error_message = "Public subnet CIDRs must be carved into /20 blocks from the VPC."
  }

  assert {
    condition     = toset([for subnet in values(aws_subnet.private) : subnet.cidr_block]) == toset(["10.0.128.0/20", "10.0.144.0/20"])
    error_message = "Private subnet CIDRs must be carved into /20 blocks from the VPC."
  }
}
