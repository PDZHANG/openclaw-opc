import { initDatabase } from '../config/database';
import { MigrationManager } from '../config/migrationManager';

async function main() {
  console.log('=== Running Database Migrations ===');
  
  try {
    await initDatabase();
    
    const migrationManager = new MigrationManager();
    const currentVersion = migrationManager.getCurrentVersion();
    
    console.log(`Current database version: ${currentVersion}`);
    
    migrationManager.migrate();
    
    const newVersion = migrationManager.getCurrentVersion();
    console.log(`New database version: ${newVersion}`);
    
    console.log('=== Migrations Complete ===');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

main();
