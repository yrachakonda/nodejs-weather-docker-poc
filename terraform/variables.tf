variable "aws_region" { type = string }
variable "name_prefix" { type = string default = "weather-sim" }
variable "cloudwatch_log_group" { type = string default = "/weather-sim/poc/app" }
