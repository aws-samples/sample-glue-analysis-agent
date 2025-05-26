import {
  DataFormat,
  Database,
  IDatabase,
  S3Table,
  Schema,
} from "@aws-cdk/aws-glue-alpha";
import { CfnOutput, RemovalPolicy, type StackProps } from "aws-cdk-lib";
import { Bucket, BlockPublicAccess, IBucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface DataCatalogProps extends StackProps {
  databaseName: string;
}

/**
 * データストレージとカタログリソースを作成するコンストラクト
 */
export class DataCatalog extends Construct {
  public readonly sourceBucket: IBucket;
  public readonly athenaResultsBucket: IBucket;
  public readonly database: IDatabase;
  public readonly orderTable: S3Table;

  constructor(scope: Construct, id: string, props: DataCatalogProps) {
    super(scope, id);

    // サーバーアクセスログ用のバケット
    const accessLogsBucket = new Bucket(this, "AccessLogsBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: false,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
    });

    // S3 bucket for storing source data
    const sourceBucket = new Bucket(this, "SourceDataBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true, // For easier cleanup in development
      versioned: false,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      serverAccessLogsBucket: accessLogsBucket,
      serverAccessLogsPrefix: "source-bucket-logs/",
    });
    this.sourceBucket = sourceBucket;

    // Athena結果用のS3バケット
    const athenaResultsBucket = new Bucket(this, "AthenaResultsBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: false,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      serverAccessLogsBucket: accessLogsBucket,
      serverAccessLogsPrefix: "athena-results-logs/",
    });
    this.athenaResultsBucket = athenaResultsBucket;

    // Create a Glue database
    const database = new Database(this, "SalesDatabase", {
      databaseName: props.databaseName,
    });
    this.database = database;

    // Create a Glue table for order data
    const orderTable = new S3Table(this, "OrderTable", {
      database,
      tableName: "order",
      columns: [
        {
          name: "order_id",
          type: Schema.STRING,
          comment: "注文ID - 地域名-年度-番号の形式",
        },
        {
          name: "order_date",
          type: Schema.STRING,
          comment: "注文日 - YYYY-MM-DD形式",
        },
        {
          name: "order_date_plain",
          type: Schema.STRING,
          comment: "注文日プレーンテキスト - YYYYMMDD形式",
        },
        {
          name: "prefecture",
          type: Schema.STRING,
          comment: "都道府県（pref） - 顧客の所在する都道府県",
        },
        {
          name: "city",
          type: Schema.STRING,
          comment: "市 - 顧客の所在する市",
        },
        {
          name: "area",
          type: Schema.STRING,
          comment: "エリア - 地域区分（関東、関西、中部など）",
        },
        {
          name: "postal_code",
          type: Schema.STRING,
          comment: "郵便番号 - 顧客の郵便番号",
        },
        {
          name: "rep_name",
          type: Schema.STRING,
          comment: "担当者名 - 販売担当者名",
        },
        {
          name: "customer_name",
          type: Schema.STRING,
          comment: "顧客名 - 購入した顧客の名前",
        },
        {
          name: "customer_id",
          type: Schema.STRING,
          comment: "顧客ID - 顧客の一意識別子",
        },
        {
          name: "product_name",
          type: Schema.STRING,
          comment: "製品名 - 購入された製品名",
        },
        {
          name: "license_key",
          type: Schema.STRING,
          comment: "ライセンスキー - 製品のライセンスキー",
        },
        {
          name: "revenue",
          type: Schema.DOUBLE,
          comment: "売上高 - 製品販売による売上高",
        },
        {
          name: "amount",
          type: Schema.INTEGER,
          comment: "数量 - 購入された製品の数量",
        },
        {
          name: "discount",
          type: Schema.DOUBLE,
          comment: "割引率 - 適用された割引率（0.0〜1.0の値）",
        },
        {
          name: "profit",
          type: Schema.DOUBLE,
          comment: "利益 - 販売による利益",
        },
        {
          name: "industry",
          type: Schema.STRING,
          comment: "業界 - 顧客が属する業界",
        },
        {
          name: "industry_segment",
          type: Schema.STRING,
          comment: "業界セグメント - 顧客が属する業界のセグメント",
        },
      ],
      parameters: {
        "skip.header.line.count": "1",
        "serialization.encoding": "UTF-8",
      },
      dataFormat: DataFormat.CSV,
      compressed: false,
      storedAsSubDirectories: false,
      bucket: sourceBucket,
      s3Prefix: "order_data/",
    });
    this.orderTable = orderTable;

    // Output the S3 bucket name for use in the upload script
    new CfnOutput(this, "SourceDataBucketName", {
      key: "SourceDataBucketName",
      value: sourceBucket.bucketName,
      description: "The name of the S3 bucket where source data is stored",
    });

    // Athena結果バケット名を出力
    new CfnOutput(this, "AthenaResultsBucketName", {
      key: "AthenaResultsBucketName",
      value: athenaResultsBucket.bucketName,
      description: "The name of the S3 bucket where Athena results are stored",
    });

    new CfnOutput(this, "GlueDatabaseName", {
      key: "GlueDatabaseName",
      value: database.databaseName,
      description: "The name of the Glue database where the data is stored",
    });

    new CfnOutput(this, "OrderTableName", {
      key: "OrderTableName",
      value: orderTable.tableName,
      description: "The name of the Glue table where the order data is stored",
    });
  }
}
