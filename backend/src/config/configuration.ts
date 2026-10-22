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

export interface AppConfig {
  port: number;
  nodeEnv: string;
  apiPrefix: string;
  corsOrigins: string[];
  logLevel: string;
}

export default (): { app: AppConfig; database: DatabaseConfig } => ({
  app: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigins: (
      process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000'
    ).split(','),
    logLevel: process.env.LOG_LEVEL || 'info',
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
});
