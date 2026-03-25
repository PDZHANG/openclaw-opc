import fs from 'fs';
import path from 'path';
import { config } from './index';

interface Database {
  agents: any[];
  messages: any[];
  groups: any[];
  agentStatus: any[];
  humans: any[];
  collaborationTasks: any[];
}

let db: Database = {
  agents: [],
  messages: [],
  groups: [],
  agentStatus: [],
  humans: [],
  collaborationTasks: []
};

const dbPath = config.databasePath;

export function initDatabase() {
  if (fs.existsSync(dbPath)) {
    try {
      const data = fs.readFileSync(dbPath, 'utf-8');
      db = JSON.parse(data);
    } catch (e) {
      console.warn('Failed to load database, using empty');
    }
  }
  return db;
}

export function saveDatabase() {
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

export function getDatabase() {
  return db;
}

export default {
  init: initDatabase,
  save: saveDatabase,
  get: getDatabase
};
