import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cr from "aws-cdk-lib/custom-resources";
import * as logs from "aws-cdk-lib/aws-logs";

import { CustomResource, Duration, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface CdkResourceInitializerProps {
  vpc: ec2.Vpc;
  securityGroups: ec2.SecurityGroup[];
  fnTimeout: Duration;
  fnCode: lambda.DockerImageCode;
  fnLogRetention: logs.RetentionDays;
  memorySize?: number;
  config: any;
}

export class CdkResourceInitializer extends Construct {
  readonly customResource: CustomResource;
  readonly dbInitializerFn: lambda.Function;

  constructor(
    scope: Construct,
    id: string,
    props: CdkResourceInitializerProps
  ) {
    super(scope, id);

    this.dbInitializerFn = this.createDbLambdaFunction(props, id);
    const customeResourceProvider = this.createCustomResourceProvider(
      props,
      this.dbInitializerFn
    );
    this.customResource = this.createCustomResource(
      props,
      customeResourceProvider
    );

    this.customResource.node.addDependency(
      this.dbInitializerFn,
      customeResourceProvider
    );
  }

  private createDbLambdaFunction(
    props: CdkResourceInitializerProps,
    id: string
  ): lambda.Function {
    return new lambda.DockerImageFunction(this, "dbInitializerFunction", {
      memorySize: props.memorySize || 128,
      functionName: `${id}-lambdaFunction`,
      code: props.fnCode,
      vpc: props.vpc,
      securityGroups: props.securityGroups,
      timeout: props.fnTimeout,
      logRetention: props.fnLogRetention,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });
  }

  private createCustomResourceProvider(
    props: CdkResourceInitializerProps,
    dbInitializerFn: lambda.Function
  ): cr.Provider {
    return new cr.Provider(this, "Provider", {
      onEventHandler: dbInitializerFn,
      logRetention: props.fnLogRetention,
      vpc: props.vpc,
      securityGroups: props.securityGroups,
    });
  }

  private createCustomResource(
    props: CdkResourceInitializerProps,
    provider: cr.Provider
  ): CustomResource {
    return new CustomResource(this, "CustomResource", {
      serviceToken: provider.serviceToken,
      properties: {
        config: props.config,
      },
      resourceType: "Custom::DBCustomResource",
    });
  }
}
