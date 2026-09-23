import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
// Private demonstration snapshots. The normalized production schema remains in database/.
export const demoLedgers = sqliteTable('demo_ledgers', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull(),
  revision: integer('revision').notNull().default(0),
  ledger: text('ledger').notNull(),
});
