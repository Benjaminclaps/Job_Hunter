CREATE TABLE `activity_events` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`title` text NOT NULL,
	`detail` text,
	`actor` text DEFAULT 'system' NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `activity_events_created_idx` ON `activity_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`stage` text DEFAULT 'interesting' NOT NULL,
	`applied_at` text,
	`next_action_at` text,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_job_idx` ON `applications` (`job_id`);--> statement-breakpoint
CREATE INDEX `applications_stage_idx` ON `applications` (`stage`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`website` text,
	`logo_url` text,
	`description` text,
	`industry` text,
	`priority` integer DEFAULT 2 NOT NULL,
	`watchlisted` integer DEFAULT true NOT NULL,
	`ats_provider` text,
	`ats_board_token` text,
	`last_scanned_at` text,
	`last_scan_status` text,
	`last_scan_error` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companies_slug_idx` ON `companies` (`slug`);--> statement-breakpoint
CREATE INDEX `companies_watchlist_idx` ON `companies` (`watchlisted`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`kind` text NOT NULL,
	`original_name` text NOT NULL,
	`stored_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`sha256` text NOT NULL,
	`extracted_text` text DEFAULT '' NOT NULL,
	`reviewed` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `documents_profile_idx` ON `documents` (`profile_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `experiences` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`title` text NOT NULL,
	`organization` text,
	`description` text DEFAULT '' NOT NULL,
	`started_at` text,
	`ended_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `experiences_profile_idx` ON `experiences` (`profile_id`);--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`sentiment` text NOT NULL,
	`reason_code` text,
	`explanation` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `feedback_job_idx` ON `feedback` (`job_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `job_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`method` text NOT NULL,
	`evaluator` text NOT NULL,
	`assessment_status` text NOT NULL,
	`professional_alignment` real,
	`learning_potential_score` real,
	`experience_compatibility` real,
	`conditions_and_duration` real,
	`career_projection` real,
	`calculated_score` real,
	`segment` text NOT NULL,
	`eligibility` text NOT NULL,
	`professional_category` text NOT NULL,
	`strengths` text DEFAULT '[]' NOT NULL,
	`weaknesses` text DEFAULT '[]' NOT NULL,
	`missing_requirements` text DEFAULT '[]' NOT NULL,
	`learning_potential` text NOT NULL,
	`justification` text NOT NULL,
	`recommendation` text NOT NULL,
	`confidence` real NOT NULL,
	`unknowns` text DEFAULT '[]' NOT NULL,
	`evidence` text NOT NULL,
	`weights_snapshot` text NOT NULL,
	`evaluated_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `job_evaluations_job_idx` ON `job_evaluations` (`job_id`,`evaluated_at`);--> statement-breakpoint
CREATE TABLE `job_search_runs` (
	`job_id` text NOT NULL,
	`search_run_id` text NOT NULL,
	PRIMARY KEY(`job_id`, `search_run_id`),
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`search_run_id`) REFERENCES `search_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`source_id` text NOT NULL,
	`external_id` text,
	`fingerprint` text NOT NULL,
	`title` text NOT NULL,
	`category` text,
	`location` text,
	`workplace_mode` text DEFAULT 'unknown' NOT NULL,
	`employment_type` text,
	`description` text DEFAULT '' NOT NULL,
	`requirements` text DEFAULT '[]' NOT NULL,
	`responsibilities` text DEFAULT '[]' NOT NULL,
	`original_url` text NOT NULL,
	`published_at` text,
	`source_updated_at` text,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`personal_notes` text DEFAULT '' NOT NULL,
	`raw_payload` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_fingerprint_idx` ON `jobs` (`fingerprint`);--> statement-breakpoint
CREATE INDEX `jobs_company_idx` ON `jobs` (`company_id`);--> statement-breakpoint
CREATE INDEX `jobs_status_idx` ON `jobs` (`status`);--> statement-breakpoint
CREATE INDEX `jobs_published_idx` ON `jobs` (`published_at`);--> statement-breakpoint
CREATE TABLE `preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`kind` text NOT NULL,
	`value` text NOT NULL,
	`priority` integer DEFAULT 2 NOT NULL,
	`source` text DEFAULT 'explicit' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `preferences_profile_kind_value_idx` ON `preferences` (`profile_id`,`kind`,`value`);--> statement-breakpoint
CREATE INDEX `preferences_profile_idx` ON `preferences` (`profile_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text DEFAULT 'Benjamin Claps' NOT NULL,
	`headline` text DEFAULT 'Estudiante universitario buscando práctica profesional' NOT NULL,
	`location` text DEFAULT 'Santiago, Chile' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`education` text DEFAULT '[]' NOT NULL,
	`projects` text DEFAULT '[]' NOT NULL,
	`languages` text DEFAULT '[]' NOT NULL,
	`interests` text DEFAULT '[]' NOT NULL,
	`objectives` text DEFAULT '[]' NOT NULL,
	`restrictions` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `search_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text,
	`company_id` text,
	`status` text NOT NULL,
	`discovered_count` integer DEFAULT 0 NOT NULL,
	`inserted_count` integer DEFAULT 0 NOT NULL,
	`updated_count` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`error` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `search_runs_started_idx` ON `search_runs` (`started_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'general' NOT NULL,
	`level` text DEFAULT 'self_reported' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skills_profile_name_idx` ON `skills` (`profile_id`,`name`);--> statement-breakpoint
CREATE INDEX `skills_profile_idx` ON `skills` (`profile_id`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`base_url` text,
	`enabled` integer DEFAULT true NOT NULL,
	`last_success_at` text,
	`last_error_at` text,
	`last_error` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sources_kind_idx` ON `sources` (`kind`);