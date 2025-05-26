import { Stack, type StackProps } from "aws-cdk-lib";
import type { Construct } from "constructs";
import { ChatApi } from "./constructs/api";
import { DataCatalog } from "./constructs/data-catalog";
import { BedrockAgent } from "./constructs/agent";
import { WebApp } from "./constructs/web-app";

export interface InfraProps extends StackProps {
  userPoolDomainPrefix: string;
  databaseName: string;
  callbackUrls: string[];
  logoutUrls: string[];
  selfSignUpEnabled: boolean;
  webAclArn: string; // WAFのWebACL ARN（必須）
}

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props: InfraProps) {
    super(scope, id, props);

    // データストレージとカタログリソースを作成
    const dataCatalog = new DataCatalog(this, "DataCatalog", {
      databaseName: props.databaseName,
    });

    // 分析エージェント関連のリソースを作成
    const agent = new BedrockAgent(this, "Agent", {
      sourceBucket: dataCatalog.sourceBucket,
      athenaResultsBucket: dataCatalog.athenaResultsBucket,
      database: dataCatalog.database,
      orderTable: dataCatalog.orderTable,
    });

    // チャットAPI関連のリソースを作成
    const chatApi = new ChatApi(this, "ChatApi", {
      bedrockAgent: agent.bedrockAgent,
      bedrockAgentAlias: agent.bedrockAgentAlias,
      userPoolDomainPrefix: props.userPoolDomainPrefix,
      selfSignUpEnabled: props.selfSignUpEnabled,
    });

    // ウェブアプリケーション関連のリソースを作成
    new WebApp(this, "WebApp", {
      appsyncEventsHttpDns: chatApi.eventApi.httpDns,
      userPool: chatApi.userPool,
      userPoolDomainName: chatApi.userPoolDomainName,
      callbackUrls: props.callbackUrls,
      logoutUrls: props.logoutUrls,
      webAclArn: props.webAclArn,
    });
  }
}
