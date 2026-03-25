import { initDatabase } from '../config/database';
import { MigrationManager } from '../config/migrationManager';

async function main() {
  console.log('=== Checking Migration Status ===');
  
  try {
    await initDatabase();
    
    const migrationManager = new MigrationManager();
    const currentVersion = migrationManager.getCurrentVersion();
    
    console.log(`Current database schema version: ${currentVersion}`);
    console.log('=== Status Check Complete ===');
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking migration status:', error);
    process.exit(1);
  }
}

main();
