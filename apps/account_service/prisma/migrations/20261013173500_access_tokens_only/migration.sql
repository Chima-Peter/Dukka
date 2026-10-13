-- Delete any refresh tokens; access-only going forward
DELETE FROM "Token" WHERE "type" = 'REFRESH';

-- Recreate enum with ACCESS only
CREATE TYPE "TokenType_new" AS ENUM ('ACCESS');

ALTER TABLE "Token"
  ALTER COLUMN "type" TYPE "TokenType_new"
  USING ("type"::text::"TokenType_new");

DROP TYPE "TokenType";

ALTER TYPE "TokenType_new" RENAME TO "TokenType";
