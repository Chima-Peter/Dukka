-- Rename ServiceCountry.code → iso2 and add iso3
ALTER TABLE "ServiceCountry" RENAME COLUMN "code" TO "iso2";
ALTER TABLE "ServiceCountry" ALTER COLUMN "iso2" SET DATA TYPE CHAR(2);

ALTER INDEX "ServiceCountry_code_key" RENAME TO "ServiceCountry_iso2_key";

ALTER TABLE "ServiceCountry" ADD COLUMN "iso3" CHAR(3);

UPDATE "ServiceCountry"
SET "iso3" = CASE TRIM("iso2")
    WHEN 'NG' THEN 'NGA'
    WHEN 'GH' THEN 'GHA'
    ELSE RPAD(TRIM("iso2"), 3, 'X')
END;

ALTER TABLE "ServiceCountry" ALTER COLUMN "iso3" SET NOT NULL;

CREATE UNIQUE INDEX "ServiceCountry_iso3_key" ON "ServiceCountry"("iso3");
