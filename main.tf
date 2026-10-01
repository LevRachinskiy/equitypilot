terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
provider "aws" {
  region = var.region
}
variable "region" {
  type    = string
  default = "us-east-1"
}
variable "vpc_id" {
  type = string
}
variable "subnet_id" {
  type = string
}
data "aws_ami" "linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
}
resource "aws_ecr_repository" "app" {
  name         = "equitypilot-demo"
  force_delete = true
  image_scanning_configuration {
    scan_on_push = true
  }
}
resource "aws_security_group" "app" {
  name_prefix = "equitypilot-"
  vpc_id      = var.vpc_id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
resource "aws_iam_role" "app" {
  name_prefix = "equitypilot-"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
resource "aws_iam_role_policy" "pull" {
  role = aws_iam_role.app.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["ecr:GetAuthorizationToken"], Resource = "*" },
      { Effect = "Allow", Action = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:BatchCheckLayerAvailability"], Resource = aws_ecr_repository.app.arn }
    ]
  })
}
resource "aws_iam_instance_profile" "app" {
  role = aws_iam_role.app.name
}
resource "aws_instance" "app" {
  ami                         = data.aws_ami.linux.id
  instance_type               = "t3.small"
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [aws_security_group.app.id]
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.app.name
  metadata_options {
    http_tokens = "required"
  }
  root_block_device {
    encrypted   = true
    volume_size = 20
    volume_type = "gp3"
  }
  user_data = <<-SCRIPT
    #!/bin/bash
    set -eu
    dnf install -y docker
    systemctl enable --now docker
  SCRIPT
  tags = { Name = "EquityPilot private demo" }
}
output "repository_url" {
  value = aws_ecr_repository.app.repository_url
}
output "instance_id" {
  value = aws_instance.app.id
}
