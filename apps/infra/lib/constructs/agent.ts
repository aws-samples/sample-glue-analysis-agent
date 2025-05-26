import * as path from "node:path";
import {
  BedrockFoundationModel,
  Agent,
  IAgent,
  IAgentAlias,
  Memory,
  AgentActionGroup,
  ActionGroupExecutor,
  ApiSchema,
} from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock";
import { CfnOutput, Duration, type StackProps } from "aws-cdk-lib";
import {
  PolicyStatement,
} from "aws-cdk-lib/aws-iam";
import {
  DockerImageCode,
  DockerImageFunction,
  Tracing,
} from "aws-cdk-lib/aws-lambda";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { IDatabase, S3Table } from "@aws-cdk/aws-glue-alpha";

export interface AgentProps extends StackProps {
  sourceBucket: IBucket;
  athenaResultsBucket: IBucket;
  database: IDatabase;
  orderTable: S3Table;
}

/**
 * 分析エージェント関連のリソースを作成するコンストラクト
 */
export class BedrockAgent extends Construct {
  public readonly bedrockAgent: IAgent;
  public readonly bedrockAgentAlias: IAgentAlias;

  constructor(scope: Construct, id: string, props: AgentProps) {
    super(scope, id);

    // Lambda関数の作成 (Python) - Dockerイメージを使用
    const agentFunction = new DockerImageFunction(
      this,
      "SalesAnalysisAgentFunction",
      {
        code: DockerImageCode.fromImageAsset(
          path.join(__dirname, "../../../agents"),
        ),
        environment: {
          POWERTOOLS_SERVICE_NAME: "sales-analysis-agent",
          POWERTOOLS_LOG_LEVEL: "DEBUG",
          ATHENA_RESULTS_BUCKET_NAME: props.athenaResultsBucket.bucketName,
          GLUE_DATABASE_NAME: props.database.databaseName,
        },
        timeout: Duration.minutes(15),
        memorySize: 1024,
        tracing: Tracing.ACTIVE, // X-Ray トレースを有効化
      },
    );

    // Lambda に必要な権限を付与
    props.orderTable.grantRead(agentFunction);
    props.athenaResultsBucket.grantReadWrite(agentFunction);
    props.sourceBucket.grantRead(agentFunction);
    agentFunction.addToRolePolicy(
      new PolicyStatement({
        actions: [
          "glue:GetTable",
          "glue:GetTables",
          "glue:GetDatabase",
          "glue:GetDatabases",
          "athena:StartQueryExecution",
          "athena:GetQueryExecution",
          "athena:GetQueryResults",
        ],
        resources: ["*"],
      }),
    );

    // Bedrock Agent の作成
    const bedrockAgent = new Agent(this, "SalesAnalysisAgent", {
      foundationModel: BedrockFoundationModel.ANTHROPIC_CLAUDE_3_5_SONNET_V2_0,
      userInputEnabled: true,
      shouldPrepareAgent: true,
      codeInterpreterEnabled: true,
      memory: Memory.SESSION_SUMMARY,
      instruction: `あなたはユーザーに代わってデータ分析を行うデータアナリストです。
## タスク
- AWS Glue で必要なデータが格納されているテーブルと列を特定する
- ユーザーの質問が曖昧でタスクが特定できない場合は入力を促す
- Amazon Athenaにクエリを実行する
- データの可視化が必要な場合は、Code Interpreter を使用してチャートを作成する

## 制約
- Markdownを使用する
- チャートではマルチバイト文字が使えないため、チャート内は英語にする
- データから意図した結果が得られない場合は、その旨を正直に回答する。サンプルデータでの回答は禁止されている
- 画像データ → テキストデータの順番で生成する

## ツール
- 利用可能なデータベース: ${props.database.databaseName}
- 一度のクエリで25KBまでのデータのみ取得できる。データを全件取得するのではなく、特定の列や行に絞って取得したり、可能な限りSQLで集計を行ったりする。25KB以上のデータが必要な場合は、複数回に分けてクエリする
- `,
    });
    this.bedrockAgent = bedrockAgent;

    // Action Group の作成
    const actionGroup = new AgentActionGroup({
      name: "SalesDataAnalysisTools",
      description: "売上データ分析のためのアクショングループ",
      executor: ActionGroupExecutor.fromlambdaFunction(agentFunction),
      apiSchema: ApiSchema.fromLocalAsset(
        path.join(__dirname, "../../../agents/resources/schema.json"),
      ),
    });

    // Agent に Action Group を追加
    bedrockAgent.addActionGroup(actionGroup);

    // テスト用エイリアスを取得
    this.bedrockAgentAlias = bedrockAgent.testAlias;

    // Bedrock Agent IDを出力
    new CfnOutput(this, "SalesAnalysisAgentId", {
      key: "SalesAnalysisAgentId",
      value: bedrockAgent.agentId,
      description: "ID of the Bedrock Agent for Sales Analysis",
    });

    new CfnOutput(this, "SalesAnalysisAgentAliasId", {
      key: "SalesAnalysisAgentAliasId",
      value: bedrockAgent.testAlias.aliasId,
      description: "ID of the Bedrock Agent Alias for Sales Analysis",
    });
  }
}
