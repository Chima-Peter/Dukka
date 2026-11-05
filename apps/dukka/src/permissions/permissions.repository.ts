import { Injectable } from '@nestjs/common';
import {
    type Permission,
    type ScopeType,
    PrismaService,
} from '@app/common';
import {
    hasGlobalScope,
    resolveActorDistributionPointIds,
    resolveActorWarehouseIds,
    type StaffScopeRef,
} from '../shared/access-control.js';

@Injectable()
export class PermissionsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(scope_types: ScopeType[]): Promise<Permission[]> {
        if (scope_types.length === 0) {
            return [];
        }

        return await this.prisma.permission.findMany({
            where: { scope_type: { in: scope_types } },
            orderBy: [{ scope_type: 'asc' }, { name: 'asc' }],
        });
    }

    async findNamesByStaffId(staffId: string): Promise<string[] | null> {
        const staff = await this.prisma.staff.findUnique({
            where: { id: staffId },
            select: {
                role: {
                    select: {
                        role_permissions: {
                            select: {
                                permission: {
                                    select: { name: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!staff) {
            return null;
        }

        return (
            staff.role?.role_permissions.map(
                (rolePermission) => rolePermission.permission.name,
            ) ?? []
        );
    }

    async findNamesByStaffIdInScope(
        staffId: string,
        actor: {
            scopes: readonly StaffScopeRef[];
            market_ids: readonly string[];
            hierarchy: number | null;
        },
    ): Promise<string[] | null> {
        if (actor.hierarchy === null) {
            return null;
        }

        if (hasGlobalScope(actor.scopes)) {
            return this.findNamesByStaffId(staffId);
        }

        const hasMarketScope = actor.scopes.some(
            (scope) => scope.scope_type === 'MARKET',
        );
        let staffScopesFilter:
            | {
                  some: {
                      market_id?: { in: string[] };
                      scope_type?: 'WAREHOUSE' | 'DISTRIBUTION_POINT';
                      warehouse_id?: { in: string[] };
                      distribution_point_id?: { in: string[] };
                  };
              }
            | undefined;

        if (hasMarketScope) {
            if (actor.market_ids.length === 0) {
                return null;
            }
            staffScopesFilter = {
                some: { market_id: { in: [...actor.market_ids] } },
            };
        } else {
            const warehouseIds = resolveActorWarehouseIds(actor.scopes);
            if (warehouseIds.length > 0) {
                staffScopesFilter = {
                    some: {
                        scope_type: 'WAREHOUSE',
                        warehouse_id: { in: warehouseIds },
                    },
                };
            } else {
                const distributionPointIds =
                    resolveActorDistributionPointIds(actor.scopes);
                if (distributionPointIds.length === 0) {
                    return null;
                }
                staffScopesFilter = {
                    some: {
                        scope_type: 'DISTRIBUTION_POINT',
                        distribution_point_id: { in: distributionPointIds },
                    },
                };
            }
        }

        const staff = await this.prisma.staff.findFirst({
            where: {
                id: staffId,
                staff_scopes: staffScopesFilter,
            },
            select: {
                role: {
                    select: {
                        role_permissions: {
                            select: {
                                permission: {
                                    select: { name: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!staff) {
            return null;
        }

        return (
            staff.role?.role_permissions.map(
                (rolePermission) => rolePermission.permission.name,
            ) ?? []
        );
    }
}
