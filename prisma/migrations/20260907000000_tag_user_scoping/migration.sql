-- Tags become per-user. Written data-safe rather than assuming an empty table:
-- the column is added nullable, every existing row is given an owner derived
-- from the items referencing it, and only then made NOT NULL.

-- The old global unique blocks step 2 (a clone reuses its source's name), so it
-- has to go before any row is written.
DROP INDEX "Tag_name_key";

ALTER TABLE "Tag" ADD COLUMN "userId" TEXT;

-- 1. A tag's owner is the owner of the items using it. Where several users share
--    a tag, the lowest user id keeps the original row.
UPDATE "Tag" t
SET "userId" = s."userId"
FROM (
  SELECT j."B" AS tag_id, MIN(i."userId") AS "userId"
  FROM "_ItemTags" j
  JOIN "Item" i ON i.id = j."A"
  GROUP BY j."B"
) s
WHERE t.id = s.tag_id;

-- 2. Every other owner of a shared tag gets their own copy...
CREATE TEMP TABLE tag_clone AS
SELECT gen_random_uuid()::text AS new_id, t.id AS old_id, o."userId"
FROM "Tag" t
JOIN (
  SELECT DISTINCT j."B" AS tag_id, i."userId"
  FROM "_ItemTags" j
  JOIN "Item" i ON i.id = j."A"
) o ON o.tag_id = t.id
WHERE o."userId" <> t."userId";

INSERT INTO "Tag" (id, name, "userId")
SELECT c.new_id, t.name, c."userId"
FROM tag_clone c
JOIN "Tag" t ON t.id = c.old_id;

-- 3. ...and that owner's item links move onto the copy.
UPDATE "_ItemTags" j
SET "B" = c.new_id
FROM tag_clone c, "Item" i
WHERE j."B" = c.old_id
  AND i.id = j."A"
  AND i."userId" = c."userId";

DROP TABLE tag_clone;

-- 4. A tag no item references has no owner to inherit and nothing can reach it.
DELETE FROM "Tag" WHERE "userId" IS NULL;

ALTER TABLE "Tag" ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX "Tag_userId_idx" ON "Tag"("userId");
CREATE UNIQUE INDEX "Tag_userId_name_key" ON "Tag"("userId", "name");

ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
