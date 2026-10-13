CREATE TABLE `attempts` (
	`run_id` text NOT NULL,
	`test_id` text NOT NULL,
	`attempt_index` integer NOT NULL,
	`position` integer NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`error_fingerprint` text,
	`error_family` text,
	`error_type` text,
	`error_message` text,
	`error_stack` text,
	`error_locator` text,
	`error_matcher` text,
	`error_failed_at_ms` integer,
	`network` text,
	`console` text,
	`page_errors` text,
	`page_errors_dropped` integer,
	`artifacts` text,
	PRIMARY KEY(`run_id`, `test_id`, `attempt_index`),
	FOREIGN KEY (`run_id`,`test_id`) REFERENCES `test_results`(`run_id`,`test_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attempts_error_fingerprint_idx` ON `attempts` (`error_fingerprint`);--> statement-breakpoint
CREATE TABLE `errors` (
	`fingerprint` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`family` text NOT NULL,
	`sample_message` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`schema_version` integer NOT NULL,
	`commit_sha` text NOT NULL,
	`head_sha` text,
	`branch` text,
	`base_branch` text,
	`dirty` integer NOT NULL,
	`ci_provider` text,
	`ci_run_id` text,
	`ci_run_attempt` integer,
	`ci_job_id` text,
	`ci_shard_index` integer,
	`ci_shard_total` integer,
	`ci_pr_number` integer,
	`os` text NOT NULL,
	`arch` text NOT NULL,
	`node_version` text NOT NULL,
	`framework_name` text NOT NULL,
	`framework_version` text,
	`framework_config` text,
	`started_at` text NOT NULL,
	`started_at_ms` integer NOT NULL,
	`finished_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `runs_commit_sha_idx` ON `runs` (`commit_sha`);--> statement-breakpoint
CREATE INDEX `runs_branch_started_at_idx` ON `runs` (`branch`,`started_at_ms`,`id`);--> statement-breakpoint
CREATE INDEX `runs_started_at_idx` ON `runs` (`started_at_ms`,`id`);--> statement-breakpoint
CREATE TABLE `test_cases` (
	`test_id` text PRIMARY KEY NOT NULL,
	`project` text,
	`file` text NOT NULL,
	`title_path` text NOT NULL,
	`tags` text NOT NULL,
	`first_seen_ms` integer NOT NULL,
	`last_seen_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `test_results` (
	`run_id` text NOT NULL,
	`test_id` text NOT NULL,
	`position` integer NOT NULL,
	`started_at_ms` integer NOT NULL,
	`project` text,
	`file` text NOT NULL,
	`title_path` text NOT NULL,
	`tags` text NOT NULL,
	`location_line` integer,
	`location_column` integer,
	`outcome` text NOT NULL,
	`attempts_dropped` integer,
	`worker_index` integer,
	`sequence_in_worker` integer,
	`quarantined` integer NOT NULL,
	`bdd` text,
	`detail_truncated` integer,
	PRIMARY KEY(`run_id`, `test_id`),
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `test_results_test_id_started_at_idx` ON `test_results` (`test_id`,`started_at_ms`);