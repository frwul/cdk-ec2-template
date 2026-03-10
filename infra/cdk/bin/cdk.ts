#!/usr/bin/env node
import { App, Aspects } from "aws-cdk-lib";
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag";
import "source-map-support/register";
import { Ec2TemplateStack } from "../lib/ec2-template-stack";

const app = new App();

const projectName = app.node.tryGetContext("projectName") ?? "cdk-ec2-template";
const stackName =
	app.node.tryGetContext("stackName") ?? `${projectName}-ec2-stack`;

const stack = new Ec2TemplateStack(app, stackName, {
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION,
	},
	description: "Reusable TypeScript CDK EC2 blueprint",
});

stack.tags.setTag("project", projectName);
stack.tags.setTag("template", "ec2");

Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

NagSuppressions.addResourceSuppressionsByPath(
	stack,
	`/${stack.stackName}/InstanceRole/Resource`,
	[
		{
			id: "AwsSolutions-IAM4",
			reason:
				"Template uses Session Manager baseline permissions via AmazonSSMManagedInstanceCore for instance access.",
			appliesTo: [
				"Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonSSMManagedInstanceCore",
			],
		},
	],
);
