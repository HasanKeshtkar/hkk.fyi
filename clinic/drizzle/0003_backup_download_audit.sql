ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_entity_valid";--> statement-breakpoint
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_action_valid";--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_entity_valid" CHECK (entity in ('appointment', 'weekly_schedule', 'date_override', 'backup'));--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_action_valid" CHECK (action in ('create', 'update', 'cancel', 'delete', 'download'));