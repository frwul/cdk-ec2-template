# CDK EC2 Template (TypeScript)

Reusable AWS CDK TypeScript blueprint.

## What this template creates

- Creates a new VPC by default with public + private subnets (instance runs in private subnet by default)
- One Amazon Linux 2023 EC2 instance (`t3.micro`)
- Security group with outbound access
- IAM role with Systems Manager access (`AmazonSSMManagedInstanceCore`)
- CloudFormation outputs for VPC/instance/IP and an SSM connect command

## Prerequisites

- Node.js 20+
- AWS credentials configured (`aws configure` or equivalent)
- CDK bootstrapped in target account/region

## Setup

```bash
pnpm install
pnpm run synth
```

## Deploy

```bash
pnpm run deploy
```

Or with explicit account/region:

```bash
pnpm cdk deploy \
  --profile <aws-profile> \
  --context projectName=my-ec2-project \
  --context stackName=my-ec2-stack
```

## Optional context values

- `projectName` (default: `cdk-ec2-template`)
- `stackName` (default: `<projectName>-ec2-stack`)
- `useDefaultVpc` (`true` or `false`, default `false`)
- `allowPublicInstance` (`true` or `false`, default `false`)
- `enableSsh` (`true` or `false`, default `false`)
- `allowedSshCidr` (required when SSH is enabled; `0.0.0.0/0` is rejected)

Note: Default VPC lookup requires a concrete stack account/region at synth time.
If unresolved, the stack falls back to creating a new VPC and emits a warning.

Example with SSH enabled:

```bash
pnpm cdk deploy \
  --context allowPublicInstance=true \
  --context enableSsh=true \
  --context allowedSshCidr=203.0.113.0/24
```

Example creating a new VPC instead of using the default:

```bash
pnpm cdk deploy --context useDefaultVpc=false
```

## Common commands

```bash
pnpm run build      # Compile TypeScript to dist/
pnpm run watch      # Watch type-check mode
pnpm run typecheck  # Type checks without emit
pnpm run synth      # Synthesize CloudFormation
pnpm run deploy     # Deploy stack
pnpm run destroy    # Destroy stack
```
