# cdk-ec2-template

Working AWS CDK example project intended to be reused as a blueprint/template for new infrastructure repositories.

This repository contains infrastructure code under `infra/cdk` (AWS CDK + TypeScript).

## Repository layout

- `infra/cdk`: CDK app, stacks, dependencies, and deployment scripts

## AWS CLI setup

Install AWS CLI v2 (official docs):

- Linux/macOS/Windows: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

Verify installation:

```bash
aws --version
```

Configure credentials (creates default profile):

```bash
aws configure
```

Configure a named profile (example used in this repo: `training-dewire`):

```bash
aws configure --profile training-dewire
aws sts get-caller-identity --profile training-dewire
```

## Quick start

```bash
cd infra/cdk
pnpm install
pnpm run typecheck
pnpm run synth
```

## Common commands

```bash
cd infra/cdk
pnpm run build
pnpm run deploy
pnpm run destroy
pnpm cdk deploy cdk-ec2-template-ec2-stack --profile training-dewire --context useDefaultVpc=false
```

For stack details and context options, see `infra/cdk/README.md`.
