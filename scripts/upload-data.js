#!/usr/bin/env node

const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

const execAsync = promisify(exec);

// CloudFormation スタック名（デフォルト: InfraStack）
const STACK_NAME = process.env.STACK_NAME || "Dev-GlueSalesAnalysisAgent";

/**
 * メッセージをサニタイズする関数
 * @param {any} message サニタイズするメッセージ
 * @returns {string} サニタイズされたメッセージ
 */
function sanitizeLogMessage(message) {
  if (typeof message === "string") {
    return message.replace(/[\r\n]/g, " ").trim();
  }

  if (message === null || message === undefined) {
    return String(message);
  }

  if (typeof message === "object") {
    try {
      return JSON.stringify(message)
        .replace(/[\r\n]/g, " ")
        .trim();
    } catch (e) {
      return String(message)
        .replace(/[\r\n]/g, " ")
        .trim();
    }
  }

  return String(message)
    .replace(/[\r\n]/g, " ")
    .trim();
}

/**
 * CloudFormation の出力値を取得
 * @param {string} outputKey 取得する出力キー
 * @returns {Promise<string>} 出力値
 */
async function getCfnOutput(outputKey) {
  try {
    console.log(
      `CloudFormation スタック '${sanitizeLogMessage(
        STACK_NAME
      )}' から '${sanitizeLogMessage(outputKey)}' の値を取得中...`
    );

    // AWS CLI を使用して CloudFormation スタックの出力を取得
    const { stdout } = await execAsync(
      [
        "aws",
        "cloudformation",
        "describe-stacks",
        "--stack-name",
        STACK_NAME,
        "--query",
        `Stacks[0].Outputs[?OutputKey=='${outputKey}'].OutputValue`,
        "--output",
        "text",
      ].join(" ")
    );

    const value = stdout.trim();
    if (!value) {
      throw new Error(
        `CloudFormation スタック '${STACK_NAME}' に出力キー '${outputKey}' が見つかりません`
      );
    }

    console.log(
      `CloudFormation スタックの出力値: ${sanitizeLogMessage(value)}`
    );
    return value;
  } catch (error) {
    console.error(
      `CloudFormation 出力の取得に失敗しました: ${sanitizeLogMessage(
        error.message
      )}`
    );
    throw error;
  }
}

/**
 * S3 バケットにテストデータをアップロード
 * @param {string} bucketName バケット名
 * @returns {Promise<void>}
 */
async function uploadTestData(bucketName) {
  try {
    // テストデータへのパス
    const dataFilePath = path.resolve(__dirname, "../testdata/order.csv");

    // S3 のパス
    const s3Path = "s3://" + path.join(bucketName, "order_data/order.csv");

    console.log(
      `テストデータをアップロード中: ${sanitizeLogMessage(
        dataFilePath
      )} -> ${sanitizeLogMessage(s3Path)}`
    );

    // ファイルが存在するか確認
    if (!fs.existsSync(dataFilePath)) {
      throw new Error(`ファイルが見つかりません: ${dataFilePath}`);
    }

    // AWS CLI を使用してファイルをアップロード
    const { stdout, stderr } = await execAsync(
      `aws s3 cp "${dataFilePath}" "${s3Path}"`
    );

    if (stderr) {
      console.warn(`警告: ${sanitizeLogMessage(stderr)}`);
    }

    console.log(
      `ファイルのアップロードに成功しました: ${sanitizeLogMessage(s3Path)}`
    );
    console.log(sanitizeLogMessage(stdout));
  } catch (error) {
    console.error(
      `テストデータのアップロードに失敗しました: ${sanitizeLogMessage(
        error.message
      )}`
    );
    throw error;
  }
}

/**
 * メイン処理
 */
async function main() {
  try {
    // バケット名を取得
    const bucketName = await getCfnOutput("SourceDataBucketName");

    // テストデータをアップロード
    await uploadTestData(bucketName);

    console.log("処理が正常に完了しました。");
  } catch (error) {
    console.error("エラーが発生しました:", sanitizeLogMessage(error));
    process.exit(1);
  }
}

// スクリプトの実行
main();
