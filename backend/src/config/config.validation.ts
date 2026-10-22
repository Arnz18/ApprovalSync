/**
 * ApprovalSync — Environment Variable Validation
 * Milestone: FND-02
 */

export function validateConfig(config: Record<string, unknown>): Record<string, unknown> {
  const port = Number(config.PORT || 3000);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Configuration error: PORT must be a valid port number (1-65535). Got: ${config.PORT}`);
  }

  const validEnvs = ['development', 'test', 'production'];
  const nodeEnv = (config.NODE_ENV as string) || 'development';
  if (!validEnvs.includes(nodeEnv)) {
    throw new Error(`Configuration error: NODE_ENV must be one of ${validEnvs.join(', ')}. Got: ${nodeEnv}`);
  }

  return config;
}
