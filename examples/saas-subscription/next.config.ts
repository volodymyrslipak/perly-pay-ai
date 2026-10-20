import type { NextConfig } from "next";

const config: NextConfig = {
  // This folder is the app, even inside a bigger repository.
  turbopack: { root: import.meta.dirname },
  agentRules: false,
};

export default config;
