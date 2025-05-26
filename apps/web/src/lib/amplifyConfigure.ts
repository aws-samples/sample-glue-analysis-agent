import type { ResourcesConfig } from "aws-amplify";

export const getAmplifyConfig = (): ResourcesConfig => {
  const userPoolId = import.meta.env.VITE_USER_POOL_ID;
  const userPoolClientId = import.meta.env.VITE_USER_POOL_CLIENT_ID;
  const domain = import.meta.env.VITE_USER_POOL_DOMAIN;
  const region = import.meta.env.VITE_AWS_REGION || "us-east-1";
  const redirectUrl =
    import.meta.env.VITE_REDIRECT_URL || window.location.origin;
  const eventsHttpEndpoint = import.meta.env.VITE_APPSYNC_EVENTS_HTTP_DNS;

  console.log("Amplify configuration:", {
    userPoolId,
    userPoolClientId,
    domain,
    region,
    redirectUrl,
    eventsHttpEndpoint,
  });

  return {
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          oauth: {
            domain: domain,
            scopes: ["email", "openid", "profile"],
            redirectSignIn: [redirectUrl],
            redirectSignOut: [redirectUrl],
            responseType: "code",
          },
        },
      },
    },
    API: {
      Events: {
        endpoint: `https://${eventsHttpEndpoint}/event`,
        region: region,
        defaultAuthMode: "userPool",
      },
    },
  };
};
