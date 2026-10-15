CREATE SEQUENCE "public"."date_overrides_version_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
ALTER TABLE "date_overrides" ALTER COLUMN "version" SET DEFAULT nextval('date_overrides_version_seq');--> statement-breakpoint
-- Tie the sequence to the column (dropped with it; reset by TRUNCATE … RESTART IDENTITY) and start it
-- above every version already handed out, so no existing screen's version can be issued again.
ALTER SEQUENCE "public"."date_overrides_version_seq" OWNED BY "date_overrides"."version";--> statement-breakpoint
SELECT setval('"public"."date_overrides_version_seq"', GREATEST((SELECT max("version") FROM "date_overrides"), 0) + 1, false);
