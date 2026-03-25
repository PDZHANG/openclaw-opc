import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  databasePath: process.env.DATABASE_PATH || path.join(__dirname, '../../../data/db.sqlite'),
  openclawPath: process.env.OPENCLAW_PATH || path.join(process.env.USERPROFILE || process.env.HOMEPATH || '', '.openclaw'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development'
};
