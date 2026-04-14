CREATE TABLE `configFeedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configId` int NOT NULL,
	`userId` int NOT NULL,
	`comment` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `configFeedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`data` json NOT NULL,
	`isPublic` int NOT NULL DEFAULT 0,
	`scenarioId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `configurations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scenarioId` varchar(64) NOT NULL,
	`completionPct` int NOT NULL DEFAULT 0,
	`progressData` json,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProgress_id` PRIMARY KEY(`id`)
);
