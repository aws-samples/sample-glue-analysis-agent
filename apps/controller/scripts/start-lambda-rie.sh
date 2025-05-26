#!/bin/bash
set -ue

# Check wheather AWS credentials are set
if [ -z "${AWS_ACCESS_KEY_ID}" -o -z "${AWS_SECRET_ACCESS_KEY}" -o -z "${AWS_SESSION_TOKEN}" ]; then
    echo 'AWS認証情報が環境変数にセットされていません: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN'
    echo 'For AWS internal: Run `isengardcli creds <profile>`'
    exit 1
fi

finch build --target runner-with-rie -t glue-sales-analysis-agent-api:latest .
echo 'starting server...'
finch run \
    -v ~/.aws:/root/.aws \
    --env-file .env.local \
    --rm \
    -p 9000:8080 \
    -e _HANDLER=src.app.lambda_handler \
    -e POWERTOOLS_LOG_LEVEL=DEBUG \
    -e AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION} \
    -e AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} \
    -e AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} \
    -e AWS_SESSION_TOKEN=${AWS_SESSION_TOKEN} \
    glue-sales-analysis-agent-api:latest