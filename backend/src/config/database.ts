import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { config } from './index';
import { MigrationManager } from './migrationManager';

const dataDir = path.dirname(config.databasePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: any = null;
let SQL: any = null;

export async function initDatabase() {
  console.log('initDatabase called');
  console.log('Database path:', config.databasePath);
  
  if (!SQL) {
    console.log('Initializing SQL.js...');
    SQL = await initSqlJs({
      locateFile: (file: string) => `node_modules/sql.js/dist/${file}`
    });
    console.log('SQL.js initialized');
  }
  
  if (fs.existsSync(config.databasePath)) {
    console.log('Loading existing database...');
    const fileBuffer = fs.readFileSync(config.databasePath);
    db = new SQL.Database(fileBuffer);
    console.log('Existing database loaded');
  } else {
    console.log('Creating new database...');
    db = new SQL.Database();
    console.log('New database created');
  }
  
  console.log('db is now:', db ? 'not null' : 'null');
  
  await runMigrations();
  await ensureAgentStatusRecords();
  
  console.log('initDatabase complete, returning db:', db ? 'not null' : 'null');
  return db;
}

async function runMigrations() {
  console.log('Running database migrations...');
  try {
    const migrationManager = new MigrationManager();
    migrationManager.migrate();
  } catch (error) {
    console.error('Error running migrations:', error);
  }
}

async function ensureAgentStatusRecords() {
  if (!db) return;
  
  console.log('Checking agent status records...');
  const agentsResult = db.exec('SELECT id FROM agents');
  if (agentsResult.length > 0) {
    const agentIds = agentsResult[0].values.map((row: any) => row[0]);
    console.log('Found agents:', agentIds);
    
    for (const agentId of agentIds) {
      const statusCheck = db.prepare('SELECT id FROM agent_status WHERE agent_id = ?');
      const statusExists = statusCheck.get([agentId]);
      if (!statusExists) {
        console.log('Creating status for agent:', agentId);
        const now = new Date().toISOString();
        const stmt = db.prepare(`
          INSERT INTO agent_status (
            id, agent_id, connection_status, availability_status, 
            uptime, messages_sent, messages_received, tasks_completed, 
            average_response_time, health_status, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run([
          Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
          agentId,
          'online',
          'idle',
          0,
          0,
          0,
          0,
          0,
          'healthy',
          now
        ]);
      }
    }
  }
  
  saveDatabase();
}

export function saveDatabase() {
  if (!db) {
    console.log('saveDatabase called but db is null!');
    return;
  }
  // console.log('saveDatabase called, path:', config.databasePath);
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(config.databasePath, buffer);
  // console.log('Database saved successfully');
}

export function getDatabase() {
  // console.log('getDatabase called, db is:', db ? 'not null' : 'null');
  return db;
}

export default {
  init: initDatabase,
  save: saveDatabase,
  get: getDatabase
};