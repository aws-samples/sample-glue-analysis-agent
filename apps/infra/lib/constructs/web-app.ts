import * as path from "node:path";
import { CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Distribution, GeoRestriction } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Bucket, BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import { NodejsBuild } from "deploy-time-build";
import { Construct } from "constructs";
import { CfnManagedLoginBranding, IUserPool } from "aws-cdk-lib/aws-cognito";

export interface WebAppProps extends StackProps {
  appsyncEventsHttpDns: string;
  userPool: IUserPool;
  userPoolDomainName: string;
  callbackUrls: string[];
  logoutUrls: string[];
  webAclArn: string; // WAFのWebACL ARN（必須）
}

/**
 * ウェブアプリケーション関連のリソースを作成するコンストラクト
 */
export class WebApp extends Construct {
  constructor(scope: Construct, id: string, props: WebAppProps) {
    super(scope, id);

    // ウェブアプリケーションのコンテンツを格納するS3バケット
    const webBucket = new Bucket(this, "WebBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true, // 開発環境での削除を容易にするため
      versioned: false,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL, // パブリックアクセスをブロック
      publicReadAccess: false,
    });

    // CloudFrontディストリビューションの作成
    const distribution = new Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(webBucket),
      },
      // SPAのルーティングをサポートするためのエラーレスポンス設定
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
      // 地理的制限を追加（例：日本のみアクセス可能）
      geoRestriction: GeoRestriction.allowlist("JP"),
      // WAFのWebACLを関連付け
      webAclId: props.webAclArn,
      enableLogging: true,
    });

    const webAppUrl = `https://${distribution.distributionDomainName}`;
    props.callbackUrls.push(webAppUrl);
    props.logoutUrls.push(webAppUrl);

    const userPoolClient = props.userPool.addClient("UserPoolClient", {
      generateSecret: false,
      oAuth: {
        callbackUrls: props.callbackUrls,
        logoutUrls: props.logoutUrls,
        flows: { authorizationCodeGrant: true },
      },
    });

    new CfnManagedLoginBranding(this, "ManagedLoginBrand", {
      userPoolId: props.userPool.userPoolId,
      clientId: userPoolClient.userPoolClientId,
      useCognitoProvidedValues: true,
    });

    // デプロイ時にウェブアプリケーションをビルドしてS3バケットにデプロイ
    new NodejsBuild(this, "WebAppBuild", {
      assets: [
        {
          path: path.join(__dirname, "../../../web"),
        },
      ],
      destinationBucket: webBucket,
      distribution: distribution,
      outputSourceDirectory: "dist", // Viteのビルド出力ディレクトリ
      buildCommands: ["npm install", "npm run build"],
      buildEnvironment: {
        // CloudFrontのURLをリダイレクトURLとして設定
        VITE_REDIRECT_URL: webAppUrl,

        // Cognito認証情報
        VITE_USER_POOL_ID: props.userPool.userPoolId,
        VITE_USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        VITE_USER_POOL_DOMAIN: props.userPoolDomainName,
        VITE_AWS_REGION: Stack.of(this).region,

        // API Endpoints
        VITE_APPSYNC_EVENTS_HTTP_DNS: props.appsyncEventsHttpDns,
      },
    });

    // Output Cognito User Pool Client ID
    new CfnOutput(this, "UserPoolClientId", {
      key: "UserPoolClientId",
      value: userPoolClient.userPoolClientId,
    });

    // CloudFrontのURLを出力
    new CfnOutput(this, "WebAppUrl", {
      key: "WebAppUrl",
      value: webAppUrl,
      description: "The URL of the web application",
    });
  }
}
