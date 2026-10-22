/**
 * ApprovalSync — Environment Variable Validation
 * Milestone: FND-02
 */

export function validateConfig(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const port = Number(config.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Configuration error: PORT must be a valid port number (1-65535). Got: ${config.PORT}`,
    );
  }

  const validEnvs = ['development', 'test', 'production'];
  const nodeEnv = (config.NODE_ENV as string) || 'development';
  if (!validEnvs.includes(nodeEnv)) {
    throw new Error(
      `Configuration error: NODE_ENV must be one of ${validEnvs.join(', ')}. Got: ${nodeEnv}`,
    );
  }

  if (config.LOG_LEVEL !== undefined && config.LOG_LEVEL !== '') {
    const validLogLevels = ['debug', 'info', 'warn', 'error', 'fatal'];
    const logLevel = config.LOG_LEVEL as string;
    if (!validLogLevels.includes(logLevel)) {
      throw new Error(
        `Configuration error: LOG_LEVEL must be one of ${validLogLevels.join(', ')}. Got: ${logLevel}`,
      );
    }
  }

  if (config.DB_PORT !== undefined && config.DB_PORT !== '') {
    const dbPort = Number(config.DB_PORT);
    if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) {
      throw new Error(
        `Configuration error: DB_PORT must be a valid port number (1-65535). Got: ${config.DB_PORT}`,
      );
    }
  }

  if (nodeEnv === 'production') {
    if (
      !config.DB_PASSWORD ||
      typeof config.DB_PASSWORD !== 'string' ||
      config.DB_PASSWORD.trim() === '' ||
      config.DB_PASSWORD === 'postgres_dev_password' ||
      config.DB_PASSWORD === 'postgres'
    ) {
      throw new Error(
        'Configuration error: Production environment cannot rely on default or empty DB_PASSWORD. A secure, unique DB_PASSWORD must be configured.',
      );
    }

    if (
      !config.DB_HOST ||
      typeof config.DB_HOST !== 'string' ||
      config.DB_HOST.trim() === ''
    ) {
      throw new Error(
        'Configuration error: Production environment requires DB_HOST to be specified.',
      );
    }

    if (
      !config.DB_NAME ||
      typeof config.DB_NAME !== 'string' ||
      config.DB_NAME.trim() === ''
    ) {
      throw new Error(
        'Configuration error: Production environment requires DB_NAME to be specified.',
      );
    }

    if (
      !config.DB_USER ||
      typeof config.DB_USER !== 'string' ||
      config.DB_USER.trim() === ''
    ) {
      throw new Error(
        'Configuration error: Production environment requires DB_USER to be specified.',
      );
    }
  }

  return config;
}
