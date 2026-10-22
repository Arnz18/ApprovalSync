/**
 * ApprovalSync — Application Configuration Factory
 * Milestone: FND-02
 */

export interface AppConfig {
  port: number;
  nodeEnv: string;
  apiPrefix: string;
  corsOrigins: string[];
  logLevel: string;
}

export default (): { app: AppConfig } => ({
  app: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(','),
    logLevel: process.env.LOG_LEVEL || 'info',
  },
});
