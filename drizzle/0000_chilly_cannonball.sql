CREATE TABLE `demo_ledgers` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`ledger` text NOT NULL
);
