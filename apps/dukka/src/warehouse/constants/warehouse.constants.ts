import { StaffPermission } from '@app/common';

export const WAREHOUSE_MANAGER_PERMISSIONS = [
    StaffPermission.WarehousesCreate,
    StaffPermission.WarehousesUpdate,
    StaffPermission.WarehousesClose,
    StaffPermission.WarehousesOpen,
] as const;
