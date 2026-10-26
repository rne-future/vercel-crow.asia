CREATE TABLE "request_rate_limits" (
	"key" varchar(128) PRIMARY KEY NOT NULL,
	"attempts" integer NOT NULL,
	"resets_at" timestamp with time zone NOT NULL
);
