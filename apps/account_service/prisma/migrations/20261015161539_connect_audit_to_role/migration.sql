-- AddForeignKey
ALTER TABLE "role_permissions_audit" ADD CONSTRAINT "role_permissions_audit_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
