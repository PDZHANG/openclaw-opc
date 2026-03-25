import fs from 'fs';
import path from 'path';
import { getDatabase, saveDatabase } from './database';

let MIGRATIONS_DIR: string;

if (fs.existsSync(path.join(__dirname, '../migrations'))) {
  MIGRATIONS_DIR = path.join(__dirname, '../migrations');
} else if (fs.existsSync(path.join(__dirname, '../../src/migrations'))) {
  MIGRATIONS_DIR = path.join(__dirname, '../../src/migrations');
} else {
  MIGRATIONS_DIR = path.join(process.cwd(), 'src/migrations');
}

console.log('Migrations directory:', MIGRATIONS_DIR);
const CURRENT_SCHEMA_VERSION = 14;

interface Migration {
  version: number;
  name: string;
  sql: string;
}

export class MigrationManager {
  private db: any;

  constructor() {
    this.db = getDatabase();
  }

  private ensureMigrationTable(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private getAppliedMigrations(): Set<number> {
    const result = this.db.exec('SELECT version FROM schema_migrations ORDER BY version');
    if (result.length === 0) return new Set();
    return new Set(result[0].values.map((row: any) => row[0]));
  }

  private loadMigrations(): Migration[] {
    const migrations: Migration[] = [];
    
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      return migrations;
    }

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (match) {
        const version = parseInt(match[1], 10);
        const name = match[2];
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
        migrations.push({ version, name, sql });
      }
    }

    return migrations.sort((a, b) => a.version - b.version);
  }

  private hasCriticalTables(): boolean {
    try {
      const tablesResult = this.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('agents', 'humans', 'groups')");
      const hasTables = tablesResult.length > 0 && tablesResult[0].values.length >= 3;
      
      const allTablesResult = this.db.exec("SELECT name FROM sqlite_master WHERE type='table'");
      let existingTables: string[] = [];
      if (allTablesResult.length > 0) {
        existingTables = allTablesResult[0].values.map((row: any) => row[0]);
      }
      
      console.log('Existing tables:', existingTables);
      console.log('Has critical tables (agents, humans, groups):', hasTables);
      
      return hasTables;
    } catch (error) {
      console.log('Error checking critical tables:', (error as Error).message);
      return false;
    }
  }

  private isNewDatabase(): boolean {
    const tablesResult = this.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT IN ('sqlite_sequence', 'schema_migrations')");
    return tablesResult.length === 0 || tablesResult[0].values.length === 0;
  }

  private applyMigration(migration: Migration): void {
    console.log(`Applying migration ${migration.version}: ${migration.name}`);
    
    const statements = migration.sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      try {
        this.db.run(stmt);
      } catch (error) {
        const errorMsg = (error as Error).message;
        if (errorMsg.includes('duplicate column name') || 
            errorMsg.includes('already exists')) {
          console.log(`  Skipping: ${errorMsg}`);
        } else {
          throw error;
        }
      }
    }

    const stmt = this.db.prepare(
      'INSERT INTO schema_migrations (version, name) VALUES (?, ?)'
    );
    stmt.run([migration.version, migration.name]);
    
    console.log(`  ✓ Migration ${migration.version} applied successfully`);
  }

  private markAllMigrationsAsApplied(): void {
    const allMigrations = this.loadMigrations();
    const appliedMigrations = this.getAppliedMigrations();
    
    for (const migration of allMigrations) {
      if (!appliedMigrations.has(migration.version)) {
        const stmt = this.db.prepare(
          'INSERT INTO schema_migrations (version, name) VALUES (?, ?)'
        );
        stmt.run([migration.version, migration.name]);
      }
    }
  }

  private ensureMissingColumnsBeforeMigration(): void {
    console.log('Checking for missing critical columns before migration...');
    
    try {
      // Check and add is_approved to humans table
      const humansColumnsResult = this.db.exec("PRAGMA table_info(humans)");
      if (humansColumnsResult.length > 0) {
        const humansColumns = new Set(humansColumnsResult[0].values.map((row: any) => row[1]));
        console.log('humans table columns:', Array.from(humansColumns));
        
        if (!humansColumns.has('is_approved')) {
          console.log('Adding missing is_approved column to humans table...');
          try {
            this.db.run('ALTER TABLE humans ADD COLUMN is_approved INTEGER DEFAULT 0');
            console.log('Setting existing users as approved...');
            this.db.run('UPDATE humans SET is_approved = 1');
            console.log('✓ is_approved column added to humans');
            saveDatabase();
          } catch (error) {
            console.log('Warning: Could not add is_approved column:', (error as Error).message);
          }
        }
      }
      
      // Check and add updated_at to messages table
      const messagesColumnsResult = this.db.exec("PRAGMA table_info(messages)");
      if (messagesColumnsResult.length > 0) {
        const messagesColumns = new Set(messagesColumnsResult[0].values.map((row: any) => row[1]));
        if (!messagesColumns.has('updated_at')) {
          console.log('Adding missing updated_at column to messages table...');
          try {
            this.db.run('ALTER TABLE messages ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
            console.log('✓ updated_at column added to messages');
            saveDatabase();
          } catch (error) {
            console.log('Warning: Could not add updated_at column:', (error as Error).message);
          }
        }
      }
      
      // Check and fix message_read table id column if needed
      const messageReadColumnsResult = this.db.exec("PRAGMA table_info(message_read)");
      if (messageReadColumnsResult.length > 0) {
        const messageReadColumns = messageReadColumnsResult[0].values.map((row: any) => ({ 
          name: row[1], 
          type: row[2], 
          pk: row[5] 
        }));
        const idColumn = messageReadColumns.find((c: any) => c.name === 'id');
        if (idColumn && idColumn.type !== 'INTEGER') {
          console.log('Warning: message_read id column is not INTEGER, this may cause issues');
        }
      }
    } catch (error) {
      console.log('Error checking missing columns:', (error as Error).message);
    }
  }

  public migrate(): void {
    console.log('=== Starting database migration ===');
    
    this.ensureMigrationTable();
    
    // First, check and add missing critical columns
    this.ensureMissingColumnsBeforeMigration();
    
    const isNewDb = this.isNewDatabase();
    const hasCriticalTables = this.hasCriticalTables();
    const allMigrations = this.loadMigrations();
    const initialSchemaMigration = allMigrations.find(m => m.version === 1);
    
    console.log('Debug info:');
    console.log('  - isNewDb:', isNewDb);
    console.log('  - hasCriticalTables:', hasCriticalTables);
    console.log('  - Number of migrations:', allMigrations.length);
    console.log('  - initialSchemaMigration found:', !!initialSchemaMigration);
    console.log('  - Condition result:', (isNewDb || !hasCriticalTables) && !!initialSchemaMigration);
    
    if ((isNewDb || !hasCriticalTables) && initialSchemaMigration) {
      console.log('Detected new or inconsistent database, applying full initial schema...');
      
      this.applyMigration(initialSchemaMigration);
      this.markAllMigrationsAsApplied();
      
      console.log('✓ Full initial schema applied');
      saveDatabase();
    } else {
      console.log('Detected existing database, applying incremental migrations...');
      
      const appliedMigrations = this.getAppliedMigrations();
      let appliedCount = 0;
      
      for (const migration of allMigrations) {
        if (!appliedMigrations.has(migration.version)) {
          this.applyMigration(migration);
          appliedCount++;
        }
      }

      if (appliedCount === 0) {
        console.log('✓ Database is already up to date');
      } else {
        console.log(`✓ Applied ${appliedCount} migration(s)`);
        saveDatabase();
      }
    }
    
    console.log('=== Migration complete ===');
  }

  public getCurrentVersion(): number {
    this.ensureMigrationTable();
    const result = this.db.exec('SELECT MAX(version) as max_version FROM schema_migrations');
    if (result.length > 0 && result[0].values.length > 0) {
      return result[0].values[0][0] || 0;
    }
    return 0;
  }
}

export default MigrationManager;
