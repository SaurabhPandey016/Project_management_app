CREATE INDEX "project_members_user_id_idx" ON "project_members"("user_id");

CREATE INDEX "invitations_email_status_created_at_idx"
ON "invitations"("email", "status", "created_at");

CREATE INDEX "comments_parent_id_idx" ON "comments"("parent_id");
