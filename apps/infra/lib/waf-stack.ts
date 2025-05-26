import { Stack, type StackProps, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";

export interface WafStackProps extends StackProps {
  // WAFスタックには特別なプロパティは必要ありません
}

/**
 * WAF関連のリソースを管理するスタック
 */
export class WafStack extends Stack {
  public readonly webAclArn: string;

  constructor(scope: Construct, id: string, props: WafStackProps) {
    super(scope, id, props);

    // AWS WAFv2 WebACL
    const webAcl = new wafv2.CfnWebACL(this, "WebAcl", {
      scope: "CLOUDFRONT",
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "webACL",
        sampledRequestsEnabled: true,
      },
      rules: [],
    });

    this.webAclArn = webAcl.attrArn;
  }
}
