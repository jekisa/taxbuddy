export function getEnv(name, fallback = "") {
  return globalThis.process?.env?.[name] ?? fallback;
}

export function isProduction() {
  return getEnv("NODE_ENV") === "production";
}
