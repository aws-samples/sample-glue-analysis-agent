import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Amplify } from "aws-amplify";
import { AuthProvider } from "./contexts/AuthContext";
import { getAmplifyConfig } from "./lib/amplifyConfigure";

// Configure Amplify with default or environment values
Amplify.configure(getAmplifyConfig());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
