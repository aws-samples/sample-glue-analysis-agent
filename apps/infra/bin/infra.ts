#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { InfraStack } from "../lib/infra-stack";
import { WafStack } from "../lib/waf-stack";
import { devParameter } from "../parameter";

const app = new cdk.App();

// WAFスタックをus-east-1リージョンにデプロイ
const wafStack = new WafStack(app, "Dev-GlueSalesAnalysisAgent-WAF", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1", // CloudFrontに関連付けるWAFはus-east-1にデプロイする必要がある
  },
  tags: {
    envName: devParameter.envName,
  },
  crossRegionReferences: true,
});

// メインのインフラスタック
new InfraStack(app, "Dev-GlueSalesAnalysisAgent", {
  env: devParameter.env
    ? devParameter.env
    : {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
  userPoolDomainPrefix: devParameter.userPoolDomainPrefix,
  databaseName: devParameter.databaseName,
  callbackUrls: devParameter.callbackUrls,
  logoutUrls: devParameter.logoutUrls,
  selfSignUpEnabled: devParameter.selfSignUpEnabled,
  webAclArn: wafStack.webAclArn, // WAFスタックからWebACL ARNを渡す
  tags: {
    envName: devParameter.envName,
  },
  crossRegionReferences: true,
});
