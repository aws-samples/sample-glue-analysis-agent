# Response of Bedrock Agents Invocation

## invoke_agent() API Response

```json
{
  "ResponseMetadata": {
    "RequestId": "af4286be-ff18-410d-80cb-****",
    "HTTPStatusCode": 200,
    "HTTPHeaders": {
      "date": "Sat, 19 Apr 2025 11:25:31 GMT",
      "content-type": "application/vnd.amazon.eventstream",
      "transfer-encoding": "chunked",
      "connection": "keep-alive",
      "x-amzn-requestid": "af4286be-ff18-410d-80cb-****",
      "x-amz-bedrock-agent-session-id": "****",
      "x-amzn-bedrock-agent-content-type": "application/json"
    },
    "RetryAttempts": 0
  },
  "contentType": "application/json",
  "sessionId": "****",
  "completion": "<botocore.eventstream.EventStream object at 0x7f465419fb60>"
}
```

## Contents in completion (EventStream)

### trace.trace.orchestrationTrace.modelInvocationInput

Text appended in `text` field by tool responses

```json
{
  "trace": {
    "agentAliasId": "TSTALIASID",
    "agentId": "****",
    "agentVersion": "DRAFT",
    "callerChain": [
      {
        "agentAliasArn": "arn:aws:bedrock:us-west-2:****:agent-alias/****/TSTALIASID"
      }
    ],
    "eventTime": "2025-04-19 11:48:06.576540+00:00",
    "sessionId": "****",
    "trace": {
      "orchestrationTrace": {
        "modelInvocationInput": {
          "foundationModel": "anthropic.claude-3-5-sonnet-20241022-v2:0",
          "inferenceConfiguration": {
            "maximumLength": 2048,
            "stopSequences": ["</invoke>", "</answer>", "</error>"],
            "temperature": 0,
            "topK": 250,
            "topP": 1
          },
          "text": "{\"system\":\" あなたはユーザーに代わってデータ分析を行うデータアナリストです。...snip...\",\"messages\":[{\"content\":\"[{text=2021年の四半期ごとの売上を製品別に分析して, type=text}]\",\"role\":\"user\"}]}",
          "traceId": "2912658d-feae-4d10-bb5d-****",
          "type": "ORCHESTRATION"
        }
      }
    }
  }
}
```

### trace.trace.orchestrationTrace.modelInvocationOutput

```json
{
  "trace": {
    "agentAliasId": "TSTALIASID",
    "agentId": "****",
    "agentVersion": "DRAFT",
    "callerChain": [
      {
        "agentAliasArn": "arn:aws:bedrock:us-west-2:****:agent-alias/****/TSTALIASID"
      }
    ],
    "eventTime": "2025-04-19 11:48:09.193789+00:00",
    "sessionId": "****",
    "trace": {
      "orchestrationTrace": {
        "modelInvocationOutput": {
          "metadata": {
            "usage": {
              "inputTokens": 1601,
              "outputTokens": 108
            }
          },
          "rawResponse": {
            "content": "{\"stop_sequence\":null,\"usage\":{\"input_tokens\":1601,\"output_tokens\":108,\"cache_read_input_tokens\":0,\"cache_creation_input_tokens\":0},\"model\":\"claude-3-5-sonnet-20241022\",\"type\":\"message\",\"id\":\"msg_bdrk_01TLuDcw7iY8oGXhf7rusEXz\",\"content\":[{\"imageSource\":null,\"reasoningTextSignature\":null,\"reasoningRedactedContent\":null,\"name\":null,\"type\":\"text\",\"id\":null,\"source\":null,\"input\":null,\"is_error\":null,\"text\":\"<thinking>\\nまず利用可能なテーブルを確認し、売上データがどのテーブルにあるか確認します。\\n</thinking>\",\"content\":null,\"reasoningText\":null,\"guardContent\":null,\"tool_use_id\":null},{\"imageSource\":null,\"reasoningTextSignature\":null,\"reasoningRedactedContent\":null,\"name\":\"GET__SalesDataAnalysisTools__get_tables\",\"type\":\"tool_use\",\"id\":\"toolu_bdrk_01Hj9TZAWkUMNAJfW1bjKcgc\",\"source\":null,\"input\":{\"database\":\"software_sales\"},\"is_error\":null,\"text\":null,\"content\":null,\"reasoningText\":null,\"guardContent\":null,\"tool_use_id\":null}],\"role\":\"assistant\",\"stop_reason\":\"tool_use\"}"
          },
          "traceId": "2912658d-feae-4d10-bb5d-****"
        }
      }
    }
  }
}
```

### trace.trace.orchestrationTrace.rationale

```json
{
  "trace": {
    "agentAliasId": "TSTALIASID",
    "agentId": "M7HN9DWEYK",
    "agentVersion": "DRAFT",
    "callerChain": [
      {
        "agentAliasArn": "arn:aws:bedrock:us-west-2:****:agent-alias/****/TSTALIASID"
      }
    ],
    "eventTime": "2025-04-19 11:48:09.193896+00:00",
    "sessionId": "****",
    "trace": {
      "orchestrationTrace": {
        "rationale": {
          "text": "まず利用可能なテーブルを確認し、売上データがどのテーブルにあるか確認します。",
          "traceId": "2912658d-feae-4d10-bb5d-****"
        }
      }
    }
  }
}
```

### trace.trace.orchestrationTrace.invocationInput.actionGroupInvocationInput

trace.trace.orchestrationTrace.invocationInput.codeInterpreterInvocationInput (for CodeInterPreter)

```json
{
  "trace": {
    "agentAliasId": "TSTALIASID",
    "agentId": "****",
    "agentVersion": "DRAFT",
    "callerChain": [
      {
        "agentAliasArn": "arn:aws:bedrock:us-west-2:****:agent-alias/****/TSTALIASID"
      }
    ],
    "eventTime": "2025-04-19 11:48:10.556008+00:00",
    "sessionId": "****",
    "trace": {
      "orchestrationTrace": {
        "invocationInput": {
          "actionGroupInvocationInput": {
            "actionGroupName": "SalesDataAnalysisTools",
            "apiPath": "/get_tables",
            "executionType": "LAMBDA",
            "parameters": [
              {
                "name": "database",
                "type": "string",
                "value": "software_sales"
              }
            ],
            "verb": "get"
          },
          "invocationType": "ACTION_GROUP",
          "traceId": "2912658d-feae-4d10-bb5d-****"
        }
      }
    }
  }
}
```

### trace.trace.orchestrationTrace.invocationInput.observation.actionGroupInvocationOutput

```json
{
  "trace": {
    "agentAliasId": "TSTALIASID",
    "agentId": "****",
    "agentVersion": "DRAFT",
    "callerChain": [
      {
        "agentAliasArn": "arn:aws:bedrock:us-west-2:****:agent-alias/****/TSTALIASID"
      }
    ],
    "eventTime": "2025-04-19 11:48:10.556008+00:00",
    "sessionId": "****",
    "trace": {
      "orchestrationTrace": {
        "observation": {
          "actionGroupInvocationOutput": {
            "text": "{\"database\":\"software_sales\",\"tables\":[{\"name\":\"order\",\"description\":\"order generated by CDK\",\"columns_count\":18,\"created\":\"2025-04-14T12:33:28+00:00\"}],\"count\":1}"
          },
          "traceId": "2912658d-feae-4d10-bb5d-****",
          "type": "ACTION_GROUP"
        }
      }
    }
  }
}
```

**Then repeat: output, actionGroup, observation**

### File generation from Code Interpretor

```json
{
  "files": {
    "files": [
      {
        "bytes": "b'\\x89PNG\\r\\n\\x1a\\n\\x00\\x00\\x00 ...'",
        "name": "quarterly_revenue_2021.png",
        "type": "image/png"
      }
    ]
  }
}
```

## trace.trace.orchestrationTrace.observation.finalResponse

```json
{
  "trace": {
    "agentAliasId": "TSTALIASID",
    "agentId": "M7HN9DWEYK",
    "agentVersion": "DRAFT",
    "callerChain": [
      {
        "agentAliasArn": "arn:aws:bedrock:us-west-2:****:agent-alias/****/TSTALIASID"
      }
    ],
    "eventTime": "2025-04-19 11:48:58.152421+00:00",
    "sessionId": "****",
    "trace": {
      "orchestrationTrace": {
        "observation": {
          "finalResponse": {
            "text": "2021年の四半期ごとの製品別売上分析結果をお伝えします：\n\n主な特徴：\n1. ContactMatcherが年間売上高約1.34億円で最も高く、特にQ3からQ4にかけて大きく成長しています。\n2. Site Analytics（約1.06億円）とFinanceHub（約9,940万円）が2位と3位を占めています。\n3. 多くの製品がQ3-Q4に売上が増加する傾向が見られます。\n\n上位5製品の四半期推移：\n- ContactMatcher: Q1:1,922万円 → Q2:1,768万円 → Q3:4,101万円 → Q4:5,597万円\n- Site Analytics: Q1:1,713万円 → Q2:1,778万円 → Q3:3,551万円 → Q4:3,522万円\n- FinanceHub: Q1:1,160万円 → Q2:1,992万円 → Q3:3,279万円 → Q4:3,510万円\n- Marketing Suite - Gold: Q1:882万円 → Q2:1,708万円 → Q3:1,571万円 → Q4:2,822万円\n- Alchemy: Q1:2,132万円 → Q2:636万円 → Q3:498万円 → Q4:3,024万円\n\nグラフを作成しましたので、四半期ごとの推移を視覚的に確認いただけます。"
          },
          "traceId": "2912658d-feae-4d10-bb5d-****",
          "type": "FINISH"
        }
      }
    }
  }
}
```

## Final Response (chunked message)

```json
{
  "chunk": {
    "bytes": "b'2021\\xe5\\xb9\\xb4\\xe3\\x81\\xae\\xe5\\x9b...'"
  }
}
```
