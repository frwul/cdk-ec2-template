import {
    Annotations,
    CfnOutput,
    Stack,
    type StackProps,
    Token,
} from "aws-cdk-lib";
import {
    BlockDeviceVolume,
    FlowLog,
    FlowLogDestination,
    FlowLogResourceType,
    Instance,
    InstanceClass,
    InstanceSize,
    InstanceType,
    MachineImage,
    Peer,
    Port,
    SecurityGroup,
    SubnetType,
    UserData,
    Vpc,
} from "aws-cdk-lib/aws-ec2";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";

export class Ec2TemplateStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		const allowedSshCidr = this.node.tryGetContext("allowedSshCidr") as
			| string
			| undefined;
		const enableSsh =
			(this.node.tryGetContext("enableSsh") as string | undefined) === "true";
		const useDefaultVpcRequested =
			(this.node.tryGetContext("useDefaultVpc") as string | undefined) ===
			"true";
		const publicInstanceRequested =
			(this.node.tryGetContext("allowPublicInstance") as string | undefined) ===
			"true";
		const hasConcreteEnv =
			!Token.isUnresolved(this.account) && !Token.isUnresolved(this.region);
		const useDefaultVpc = useDefaultVpcRequested && hasConcreteEnv;

		if (useDefaultVpcRequested && !hasConcreteEnv) {
			Annotations.of(this).addWarning(
				"useDefaultVpc=true requested, but stack account/region are unresolved. Falling back to creating a new VPC. Set stack env account/region (or pass --profile/--context) to enable default VPC lookup.",
			);
		}

		if (enableSsh && !allowedSshCidr) {
			throw new Error(
				"enableSsh=true requires --context allowedSshCidr=<trusted-cidr>.",
			);
		}

		if (allowedSshCidr === "0.0.0.0/0") {
			throw new Error(
				"allowedSshCidr=0.0.0.0/0 is not allowed. Use a narrow trusted CIDR.",
			);
		}

		const vpc = useDefaultVpc
			? Vpc.fromLookup(this, "Vpc", { isDefault: true })
			: new Vpc(this, "Vpc", {
					maxAzs: 2,
					natGateways: 1,
					subnetConfiguration: [
						{
							name: "public",
							subnetType: SubnetType.PUBLIC,
							cidrMask: 24,
						},
						{
							name: "private",
							subnetType: SubnetType.PRIVATE_WITH_EGRESS,
							cidrMask: 24,
						},
					],
				});

		new FlowLog(this, "VpcFlowLog", {
			resourceType: FlowLogResourceType.fromVpc(vpc),
			destination: FlowLogDestination.toCloudWatchLogs(),
		});

		const usePublicSubnets = useDefaultVpc || publicInstanceRequested;

		if (useDefaultVpc && !publicInstanceRequested) {
			Annotations.of(this).addWarning(
				"useDefaultVpc=true places the instance in public subnets for connectivity. To keep private-by-default behavior, omit useDefaultVpc or use a non-default VPC.",
			);
		}

		const instanceSecurityGroup = new SecurityGroup(
			this,
			"InstanceSecurityGroup",
			{
				vpc,
				allowAllOutbound: true,
				description: "Security group for EC2 template instance",
			},
		);

		if (enableSsh) {
			if (!allowedSshCidr) {
				throw new Error(
					"enableSsh=true requires --context allowedSshCidr=<trusted-cidr>.",
				);
			}
			instanceSecurityGroup.addIngressRule(
				Peer.ipv4(allowedSshCidr),
				Port.tcp(22),
				"Optional SSH access",
			);
		}

		const instanceRole = new Role(this, "InstanceRole", {
			assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
			managedPolicies: [
				ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
			],
		});

		const userData = UserData.forLinux();
		userData.addCommands(
			"set -euxo pipefail",
			"dnf update -y",
			"dnf install -y htop git",
			"echo 'EC2 template bootstrapped on $(date -u)' > /etc/motd",
		);

		const instance = new Instance(this, "Instance", {
			vpc,
			vpcSubnets: {
				subnetType: usePublicSubnets
					? SubnetType.PUBLIC
					: SubnetType.PRIVATE_WITH_EGRESS,
			},
			securityGroup: instanceSecurityGroup,
			role: instanceRole,
			instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
			machineImage: MachineImage.latestAmazonLinux2023(),
			userData,
			detailedMonitoring: true,
			disableApiTermination: true,
			requireImdsv2: true,
			blockDevices: [
				{
					deviceName: "/dev/xvda",
					volume: BlockDeviceVolume.ebs(8, { encrypted: true }),
				},
			],
		});

		new CfnOutput(this, "VpcId", {
			value: vpc.vpcId,
		});

		new CfnOutput(this, "InstanceId", {
			value: instance.instanceId,
		});

		new CfnOutput(this, "InstancePublicIp", {
			value: instance.instancePublicIp,
		});

		new CfnOutput(this, "InstanceConnect", {
			value: `aws ssm start-session --target ${instance.instanceId}`,
			description: "Example AWS CLI command for Session Manager access",
		});
	}
}
