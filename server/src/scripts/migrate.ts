/**
 * SupplyLine migration CLI
 *
 *   npm run migration:up              Run all pending migrations (ordered by filename)
 *   npm run migration:status          List applied / pending migrations
 *   npm run migration:run -- <file>   Run one migration by filename
 */
import {
  getMigrationStatus,
  printMigrationStatus,
  runPendingMigrations,
  runSingleMigration,
} from './migrationRunner';

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const fileArg = rest.find((arg) => !arg.startsWith('-'));
  const force = rest.includes('--force');

  switch (command) {
    case 'up':
      await runPendingMigrations();
      break;

    case 'status': {
      const status = await getMigrationStatus();
      printMigrationStatus(status);
      break;
    }

    case 'run': {
      if (!fileArg) {
        throw new Error(
          'Missing migration file. Usage: npm run migration:run -- 001_init_supplyline.sql'
        );
      }
      await runSingleMigration(fileArg, { force });
      break;
    }

    default:
      console.log(`
SupplyLine migrations (database/migrations/)

  npm run migration:up                 Apply all pending migrations
  npm run migration:status             Show applied and pending migrations
  npm run migration:run -- <file.sql>  Apply a single migration by name

Options:
  --force   With migration:run, re-execute even if already applied (updates checksum)

Tracking table: sl_SchemaMigrations (created automatically on first run)
`);
      process.exit(command ? 1 : 0);
  }
}

main().catch((error: Error) => {
  console.error('❌', error.message);
  process.exit(1);
});
