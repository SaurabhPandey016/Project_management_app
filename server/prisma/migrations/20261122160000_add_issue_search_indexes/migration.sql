CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "issues_title_trgm_idx"
ON "issues" USING GIN ("title" gin_trgm_ops);

CREATE INDEX "issues_description_trgm_idx"
ON "issues" USING GIN ("description" gin_trgm_ops);

CREATE INDEX "issues_number_trgm_idx"
ON "issues" USING GIN (("number"::text) gin_trgm_ops);
