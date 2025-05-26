import * as path from "node:path";
import type {
  IAgent,
  IAgentAlias,
} from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock";
import { CfnOutput, Duration, Stack, type StackProps } from "aws-cdk-lib";
import {
  AppSyncAuthorizationType,
  EventApi,
  IEventApi,
  LambdaInvokeType,
} from "aws-cdk-lib/aws-appsync";
import {
  AdvancedSecurityMode,
  CustomThreatProtectionMode,
  FeaturePlan,
  IUserPool,
  ManagedLoginVersion,
  StandardThreatProtectionMode,
  UserPool,
  UserPoolDomain,
} from "aws-cdk-lib/aws-cognito";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import {
  DockerImageCode,
  DockerImageFunction,
  Tracing,
} from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export interface ChatApiProps extends StackProps {
  bedrockAgent: IAgent;
  bedrockAgentAlias: IAgentAlias;
  userPoolDomainPrefix: string;
  selfSignUpEnabled: boolean;
}

/**
 * チャットAPI関連のリソースを作成するコンストラクト
 */
export class ChatApi extends Construct {
  public readonly userPool: IUserPool;
  public readonly userPoolDomainName: string;
  public readonly eventApi: IEventApi;

  constructor(scope: Construct, id: string, props: ChatApiProps) {
    super(scope, id);

    const userPool = new UserPool(this, "UserPool", {
      featurePlan: FeaturePlan.PLUS,
      advancedSecurityMode: AdvancedSecurityMode.ENFORCED,
      selfSignUpEnabled: props.selfSignUpEnabled,
      signInAliases: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
    });
    this.userPool = userPool;

    const userPoolDomain = new UserPoolDomain(this, "UserpoolDomain", {
      userPool,
      cognitoDomain: {
        domainPrefix: props.userPoolDomainPrefix,
      },
      managedLoginVersion: ManagedLoginVersion.NEWER_MANAGED_LOGIN,
    });

    this.userPoolDomainName = `${userPoolDomain.domainName}.auth.${
      Stack.of(this).region
    }.amazoncognito.com`;

    const eventApi = new EventApi(this, "EventApi", {
      apiName: "SalesAnalysisAgentChatApi",
      authorizationConfig: {
        authProviders: [
          {
            authorizationType: AppSyncAuthorizationType.IAM,
          },
          {
            authorizationType: AppSyncAuthorizationType.USER_POOL,
            cognitoConfig: { userPool },
          },
        ],
      },
    });
    this.eventApi = eventApi;

    const controlNamespaceName = "control";
    const streamNamespaceName = "stream";

    // REST API用のLambda関数
    const chatEventHandler = new DockerImageFunction(this, "Controller", {
      code: DockerImageCode.fromImageAsset(
        path.join(__dirname, "../../../controller"),
        {
          target: "runner",
        }
      ),
      environment: {
        POWERTOOLS_SERVICE_NAME: "sales-analysis-chat-controller",
        POWERTOOLS_LOG_LEVEL: "INFO",
        APPSYNC_EVENTS_HTTP_DNS: eventApi.httpDns,
        APPSYNC_EVENTS_REALTIME_DNS: eventApi.realtimeDns,
        APPSYNC_EVENTS_CONTROL_NAMESPACE: controlNamespaceName,
        APPSYNC_EVENTS_STREAM_NAMESPACE: streamNamespaceName,
        SALES_ANALYSIS_AGENT_ID: props.bedrockAgent.agentId,
        SALES_ANALYSIS_AGENT_ALIAS_ID: props.bedrockAgentAlias.aliasId,
      },
      timeout: Duration.minutes(15),
      memorySize: 1024,
      tracing: Tracing.ACTIVE,
    });
    eventApi.grantPublishAndSubscribe(chatEventHandler);
    eventApi.grantConnect(chatEventHandler);

    const dataSource = eventApi.addLambdaDataSource(
      "ControllerDataSource",
      chatEventHandler
    );

    // Lambda に Bedrock へのアクセス権限を付与
    chatEventHandler.addToRolePolicy(
      new PolicyStatement({
        actions: [
          "bedrock:InvokeAgent",
          "bedrock:InvokeModelWithResponseStream",
        ],
        resources: [
          props.bedrockAgent.agentArn,
          props.bedrockAgentAlias.aliasArn,
        ],
      })
    );

    eventApi.addChannelNamespace("ControlNamespace", {
      channelNamespaceName: controlNamespaceName,
      publishHandlerConfig: {
        direct: true,
        dataSource,
        lambdaInvokeType: LambdaInvokeType.EVENT,
      },
    });

    eventApi.addChannelNamespace("StreamNamespace", {
      channelNamespaceName: streamNamespaceName,
      subscribeHandlerConfig: {
        direct: true,
        dataSource,
        lambdaInvokeType: LambdaInvokeType.EVENT,
      },
    });

    // Output the AppSync Events API URL
    new CfnOutput(this, "AppSyncEventsRealtimeDns", {
      key: "AppSyncEventsRealtimeDns",
      value: eventApi.realtimeDns,
    });

    new CfnOutput(this, "AppSyncEventsHttpDns", {
      key: "AppSyncEventsHttpDns",
      value: eventApi.httpDns,
    });

    // Output Cognito User Pool ID
    new CfnOutput(this, "UserPoolId", {
      key: "UserPoolId",
      value: userPool.userPoolId,
    });

    // Output Cognito Domain
    new CfnOutput(this, "UserPoolDomain", {
      key: "UserPoolDomain",
      value: this.userPoolDomainName,
    });
  }
}
