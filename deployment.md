# Deployment

## Local production build

Run `npm ci`, `npm run check`, `npm run build`. Start with `APP_ORIGIN=http://localhost:3001 npm start`. SQLite lives at `data/equitypilot.sqlite`; stop the process before copying the entire data directory for a simple local backup, or use SQLite's backup API in a future job.

## Container

`docker compose up --build` runs on loopback with a durable named volume. Docker must be installed. Optional live AI can be passed through container environment variables; never bake a key into an image or commit `.env`. The production CSP allows only local scripts and connections.

## AWS private demo

The included `infra/main.tf` provisions an ECR repository and one Amazon Linux EC2 instance with encrypted EBS, no inbound security-group rules, and SSM management. It is a **private sandbox template**, not a public hosted service. This keeps the sample independent of a domain, TLS certificate, or public ingress. The instance has outbound internet through a public IP; it is not in a private subnet.

Requires Terraform, AWS CLI, Docker, an existing VPC/subnet, and SSM Session Manager plugin. The subnet must have an internet gateway route for SSM and ECR access. Review costs and IAM before applying. Terraform and an actual AWS deployment were not executed in the authoring environment.

```bash
cd infra
terraform init
terraform apply -var='vpc_id=vpc-YOURS' -var='subnet_id=subnet-YOURS'
```

Then from the repository root:

```bash
export AWS_REGION=us-east-1
export REPO=$(terraform -chdir=infra output -raw repository_url)
export INSTANCE=$(terraform -chdir=infra output -raw instance_id)
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "${REPO%%/*}"
docker build --platform linux/amd64 -t "$REPO:demo" .
docker push "$REPO:demo"
```

Use an SSM shell (`aws ssm start-session --target "$INSTANCE"`) to run:

```bash
# Substitute your actual region/repository values inside the remote shell.
REGION=us-east-1
REPOSITORY=ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/equitypilot-demo
aws ecr get-login-password --region "$REGION" | sudo docker login --username AWS --password-stdin "${REPOSITORY%%/*}"
sudo docker pull "$REPOSITORY:demo"
sudo docker run -d --name equitypilot --restart unless-stopped -p 127.0.0.1:3001:3001 -v equitypilot-data:/app/data -e APP_ORIGIN=http://localhost:3001 "$REPOSITORY:demo"
```

Forward the demo to your computer:

```bash
aws ssm start-session --target "$INSTANCE" --document-name AWS-StartPortForwardingSession --parameters '{"portNumber":["3001"],"localPortNumber":["3001"]}'
```

Open http://localhost:3001. Check `/api/health`, save a plan, restart the container, and verify it persists. Destroy demo resources when finished: `terraform -chdir=infra destroy` with your same variables. This removes the instance and its volume, including demo data. The ECR repository uses force deletion for the demo.

A public production deployment should use TLS, real identity, secure cookies, a backup strategy, centralized logs, monitoring, and managed relational storage rather than exposing this sandbox directly.
