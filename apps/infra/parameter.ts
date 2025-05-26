import { Environment } from "aws-cdk-lib";

export interface AppParameter {
  env?: Environment;
  envName: string;
  userPoolDomainPrefix: string;
  databaseName: string;
  callbackUrls: string[];
  logoutUrls: string[];
  selfSignUpEnabled: boolean;
}

// Example
export const devParameter: AppParameter = {
  envName: "dev",
  userPoolDomainPrefix: "sales-analysis-chat-api-konoken",
  databaseName: "software_sales",
  callbackUrls: ["http://localhost:5173"],
  logoutUrls: ["http://localhost:5173"],
  selfSignUpEnabled: true,
};
