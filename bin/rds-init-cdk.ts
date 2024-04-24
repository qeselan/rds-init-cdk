#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { InfrastructureStack } from "../lib/infra-stack";

const app = new cdk.App();
new InfrastructureStack(app, "RdsInitCdkStack", {
  env: { region: "us-east-1", account: process.env.CDK_DEFAULT_ACCOUNT },
});
