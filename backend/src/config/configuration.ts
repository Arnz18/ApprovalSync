/**
 * ApprovalSync — Application Configuration Factory
 * Milestone: FND-02
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password?: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  issuer: string;
  audience: string;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  apiPrefix: string;
  corsOrigins: string[];
  logLevel: string;
  swaggerEnabled: boolean;
}

export default (): {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
} => ({
  app: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigins: (
      process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000'
    ).split(','),
    logLevel: process.env.LOG_LEVEL || 'info',
    swaggerEnabled:
      process.env.NODE_ENV !== 'production' ||
      process.env.ENABLE_SWAGGER === 'true',
  },
  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'approvalsync',
    user: process.env.DB_USER || 'postgres',
    password:
      process.env.NODE_ENV === 'production'
        ? process.env.DB_PASSWORD
        : process.env.DB_PASSWORD || 'postgres_dev_password',
  },
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      (process.env.NODE_ENV === 'production'
        ? ''
        : 'dev_synthetic_jwt_signing_secret_min_32_characters_for_local_demo_only'),
    expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
    issuer: process.env.JWT_ISSUER || 'approvalsync-auth',
    audience: process.env.JWT_AUDIENCE || 'approvalsync-client',
  },
});
