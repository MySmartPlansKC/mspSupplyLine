'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('tsx/cjs');

const { execute, closeSupplylinePool } = require('../config/database');

async function main() {
  try {
    console.log('Bypassing safety checks and clearing staging tables...');

    await execute('SET FOREIGN_KEY_CHECKS = 0;');
    await execute('TRUNCATE TABLE sl_Staging;');
    await execute('TRUNCATE TABLE sl_SubmittalDocuments;');
    await execute('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('✨ Staging workbench and document registries flushed completely cold!');
  } catch (error) {
    console.error('[flush-staging] Database flush failed.');
    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  } finally {
    try {
      await closeSupplylinePool();
    } catch (closeError) {
      console.error('[flush-staging] Failed to close database pool.');
      if (closeError instanceof Error) {
        console.error(`Message: ${closeError.message}`);
      }
    }

    process.exit(process.exitCode ?? 0);
  }
}

main();
