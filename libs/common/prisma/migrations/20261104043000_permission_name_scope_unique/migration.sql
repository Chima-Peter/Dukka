-- DropIndex
DROP INDEX "Permission_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_scope_type_key" ON "Permission"("name", "scope_type");
