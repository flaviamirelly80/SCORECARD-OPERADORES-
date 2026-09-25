import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/portal_desempenho',
  defaultTempPassword: process.env.DEFAULT_TEMP_PASSWORD || 'JDE@1234',
  dataSource: process.env.DATA_SOURCE === 'api' ? 'api' : 'local',
  networkRestrictionEnabled: process.env.NETWORK_RESTRICTION_ENABLED === 'true',
  allowedNetworks: (process.env.ALLOWED_NETWORKS || '').split(',').map((item) => item.trim()).filter(Boolean),
  apiKey: process.env.API_KEY,
};
