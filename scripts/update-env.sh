#!/bin/bash
set -e

# Get the stack name from command line argument or use default
STACK_NAME=${1:-"Dev-GlueSalesAnalysisAgent"}

# Get the AWS region from command line argument or use default
AWS_REGION=${2:-"us-west-2"}

echo "Fetching configuration from CloudFormation stack: $STACK_NAME in region: $AWS_REGION"

# Define the paths to the .env.local files for each module
WEB_ENV_FILE="./apps/web/.env.local"
CONTROLLER_ENV_FILE="./apps/controller/.env.local"
AGENTS_ENV_FILE="./apps/agents/.env.local"

echo "Creating/updating environment files for all modules"

# Create the files if they don't exist
touch $WEB_ENV_FILE
touch $CONTROLLER_ENV_FILE
touch $AGENTS_ENV_FILE

# Create temporary files for the new content
TMP_WEB_ENV_FILE=$(mktemp)
TMP_CONTROLLER_ENV_FILE=$(mktemp)
TMP_AGENTS_ENV_FILE=$(mktemp)

# Fetch all CloudFormation outputs at once to avoid multiple API calls
OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs" \
  --output json \
  --region $AWS_REGION)

# Function to extract output value by key
get_output_value() {
  local key=$1
  echo $OUTPUTS | jq -r ".[] | select(.OutputKey == \"$key\") | .OutputValue" 2>/dev/null || echo ""
}

# Get all required outputs
APPSYNC_EVENTS_REALTIME_DNS=$(get_output_value "AppSyncEventsRealtimeDns")
APPSYNC_EVENTS_HTTP_DNS=$(get_output_value "AppSyncEventsHttpDns")
USER_POOL_ID=$(get_output_value "UserPoolId")
USER_POOL_CLIENT_ID=$(get_output_value "UserPoolClientId")
USER_POOL_DOMAIN=$(get_output_value "UserPoolDomain")
SALES_ANALYSIS_AGENT_ID=$(get_output_value "SalesAnalysisAgentId")
SALES_ANALYSIS_AGENT_ALIAS_ID=$(get_output_value "SalesAnalysisAgentAliasId")
ATHENA_RESULTS_BUCKET_NAME=$(get_output_value "AthenaResultsBucketName")
GLUE_DATABASE_NAME=$(get_output_value "GlueDatabaseName")

# Web環境変数の設定
if [ -n "$APPSYNC_EVENTS_HTTP_DNS" ]; then
  echo "VITE_APPSYNC_EVENTS_HTTP_DNS=$APPSYNC_EVENTS_HTTP_DNS" >> $TMP_WEB_ENV_FILE
  echo "Web - AppSync Events HTTP DNS: $APPSYNC_EVENTS_HTTP_DNS"
else
  echo "Warning: Could not retrieve AppSync Events HTTP DNS from CloudFormation outputs"
  # デプロイ前のローカル開発用にデフォルト値を設定
  echo "VITE_APPSYNC_EVENTS_HTTP_DNS=localhost" >> $TMP_WEB_ENV_FILE
  echo "Web - AppSync Events HTTP DNS: localhost (default for local development)"
fi

if [ -n "$USER_POOL_ID" ]; then
  echo "VITE_USER_POOL_ID=$USER_POOL_ID" >> $TMP_WEB_ENV_FILE
  echo "Web - User Pool ID: $USER_POOL_ID"
else
  echo "Warning: Could not retrieve User Pool ID from CloudFormation outputs"
  # デプロイ前のローカル開発用にデフォルト値を設定
  echo "VITE_USER_POOL_ID=local-user-pool-id" >> $TMP_WEB_ENV_FILE
  echo "Web - User Pool ID: local-user-pool-id (default for local development)"
fi

if [ -n "$USER_POOL_CLIENT_ID" ]; then
  echo "VITE_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID" >> $TMP_WEB_ENV_FILE
  echo "Web - User Pool Client ID: $USER_POOL_CLIENT_ID"
else
  echo "Warning: Could not retrieve User Pool Client ID from CloudFormation outputs"
  # デプロイ前のローカル開発用にデフォルト値を設定
  echo "VITE_USER_POOL_CLIENT_ID=local-client-id" >> $TMP_WEB_ENV_FILE
  echo "Web - User Pool Client ID: local-client-id (default for local development)"
fi

if [ -n "$USER_POOL_DOMAIN" ]; then
  echo "VITE_USER_POOL_DOMAIN=$USER_POOL_DOMAIN" >> $TMP_WEB_ENV_FILE
  echo "Web - User Pool Domain: $USER_POOL_DOMAIN"
else
  echo "Warning: Could not retrieve User Pool Domain from CloudFormation outputs"
  # デプロイ前のローカル開発用にデフォルト値を設定
  echo "VITE_USER_POOL_DOMAIN=local-domain.auth.us-west-2.amazoncognito.com" >> $TMP_WEB_ENV_FILE
  echo "Web - User Pool Domain: local-domain.auth.us-west-2.amazoncognito.com (default for local development)"
fi

# Add AWS region for web
echo "VITE_AWS_REGION=$AWS_REGION" >> $TMP_WEB_ENV_FILE
echo "Web - AWS Region: $AWS_REGION"

# Add redirect URL (default to localhost for development)
echo "VITE_REDIRECT_URL=http://localhost:5173" >> $TMP_WEB_ENV_FILE
echo "Web - Redirect URL: http://localhost:5173 (default)"

# Controller環境変数の設定
if [ -n "$SALES_ANALYSIS_AGENT_ID" ]; then
  echo "SALES_ANALYSIS_AGENT_ID=$SALES_ANALYSIS_AGENT_ID" >> $TMP_CONTROLLER_ENV_FILE
  echo "Controller - Sales Analysis Agent ID: $SALES_ANALYSIS_AGENT_ID"
else
  echo "Warning: Could not retrieve Sales Analysis Agent ID from CloudFormation outputs"
  # デプロイ前のローカル開発用にデフォルト値を設定
  echo "SALES_ANALYSIS_AGENT_ID=local-agent-id" >> $TMP_CONTROLLER_ENV_FILE
  echo "Controller - Sales Analysis Agent ID: local-agent-id (default for local development)"
fi

if [ -n "$SALES_ANALYSIS_AGENT_ALIAS_ID" ]; then
  echo "SALES_ANALYSIS_AGENT_ALIAS_ID=$SALES_ANALYSIS_AGENT_ALIAS_ID" >> $TMP_CONTROLLER_ENV_FILE
  echo "Controller - Sales Analysis Agent Alias ID: $SALES_ANALYSIS_AGENT_ALIAS_ID"
else
  echo "Warning: Could not retrieve Sales Analysis Agent Alias ID from CloudFormation outputs"
  # デプロイ前のローカル開発用にデフォルト値を設定
  echo "SALES_ANALYSIS_AGENT_ALIAS_ID=local-agent-alias-id" >> $TMP_CONTROLLER_ENV_FILE
  echo "Controller - Sales Analysis Agent Alias ID: local-agent-alias-id (default for local development)"
fi

if [ -n "$APPSYNC_EVENTS_HTTP_DNS" ]; then
  echo "APPSYNC_EVENTS_HTTP_DNS=$APPSYNC_EVENTS_HTTP_DNS" >> $TMP_CONTROLLER_ENV_FILE
  echo "Controller - AppSync Events HTTP DNS: $APPSYNC_EVENTS_HTTP_DNS"
else
  echo "Warning: Could not retrieve AppSync Events HTTP DNS from CloudFormation outputs"
  # デプロイ前のローカル開発用にデフォルト値を設定
  echo "APPSYNC_EVENTS_HTTP_DNS=localhost" >> $TMP_CONTROLLER_ENV_FILE
  echo "Controller - AppSync Events HTTP DNS: localhost (default for local development)"
fi

if [ -n "$APPSYNC_EVENTS_REALTIME_DNS" ]; then
  echo "APPSYNC_EVENTS_REALTIME_DNS=$APPSYNC_EVENTS_REALTIME_DNS" >> $TMP_CONTROLLER_ENV_FILE
  echo "Controller - AppSync Events Realtime DNS: $APPSYNC_EVENTS_REALTIME_DNS"
else
  echo "Warning: Could not retrieve AppSync Events Realtime DNS from CloudFormation outputs"
  # デプロイ前のローカル開発用にデフォルト値を設定
  echo "APPSYNC_EVENTS_REALTIME_DNS=localhost" >> $TMP_CONTROLLER_ENV_FILE
  echo "Controller - AppSync Events Realtime DNS: localhost (default for local development)"
fi

# コントローラーのチャネル名前空間を設定
echo "APPSYNC_EVENTS_CONTROL_NAMESPACE=control" >> $TMP_CONTROLLER_ENV_FILE
echo "Controller - AppSync Events Control Namespace: control (default)"

echo "APPSYNC_EVENTS_STREAM_NAMESPACE=stream" >> $TMP_CONTROLLER_ENV_FILE
echo "Controller - AppSync Events Stream Namespace: stream (default)"

# AWS Region for controller
echo "AWS_REGION=$AWS_REGION" >> $TMP_CONTROLLER_ENV_FILE
echo "Controller - AWS Region: $AWS_REGION"

# Update Agents environment variables
if [ -n "$ATHENA_RESULTS_BUCKET_NAME" ]; then
  echo "ATHENA_RESULTS_BUCKET_NAME=$ATHENA_RESULTS_BUCKET_NAME" >> $TMP_AGENTS_ENV_FILE
  echo "Agents - Athena Results Bucket Name: $ATHENA_RESULTS_BUCKET_NAME"
else
  echo "Warning: Could not retrieve Athena Results Bucket Name from CloudFormation outputs"
  # デプロイ前のローカル開発用にデフォルト値を設定
  echo "ATHENA_RESULTS_BUCKET_NAME=local-athena-results" >> $TMP_AGENTS_ENV_FILE
  echo "Agents - Athena Results Bucket Name: local-athena-results (default for local development)"
fi

if [ -n "$GLUE_DATABASE_NAME" ]; then
  echo "GLUE_DATABASE_NAME=$GLUE_DATABASE_NAME" >> $TMP_AGENTS_ENV_FILE
  echo "Agents - Glue Database Name: $GLUE_DATABASE_NAME"
else
  echo "Warning: Could not retrieve Glue Database Name from CloudFormation outputs"
  # デプロイ前のローカル開発用にデフォルト値を設定
  echo "GLUE_DATABASE_NAME=software_sales" >> $TMP_AGENTS_ENV_FILE
  echo "Agents - Glue Database Name: software_sales (default for local development)"
fi

# AWS Region for agents
echo "AWS_REGION=$AWS_REGION" >> $TMP_AGENTS_ENV_FILE
echo "Agents - AWS Region: $AWS_REGION"

# Replace the original files with our updated ones
mv $TMP_WEB_ENV_FILE $WEB_ENV_FILE
mv $TMP_CONTROLLER_ENV_FILE $CONTROLLER_ENV_FILE
mv $TMP_AGENTS_ENV_FILE $AGENTS_ENV_FILE

echo "Environment configuration updated successfully for all modules!"
