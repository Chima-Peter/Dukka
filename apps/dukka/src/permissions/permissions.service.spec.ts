import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCommonMock } from '../staff/test/common.mock.js';
import { PermissionsRepository } from './permissions.repository.js';
import { PermissionsService } from './permissions.service.js';

vi.mock('../../../../libs/common/src/index.ts', async (importOriginal) =>
    createCommonMock(importOriginal),
);

describe('PermissionsService', () => {
    let service: PermissionsService;
    let permissionsRepository: {
        findAll: ReturnType<typeof vi.fn>;
        findNamesByStaffId: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        permissionsRepository = {
            findAll: vi.fn(),
            findNamesByStaffId: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PermissionsService,
                {
                    provide: PermissionsRepository,
                    useValue: permissionsRepository,
                },
            ],
        }).compile();

        service = module.get<PermissionsService>(PermissionsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('extracts permission names from a staff auth record', () => {
        const staff = {
            role: {
                role_permissions: [
                    { permission: { name: 'staff:manage' } },
                    { permission: { name: 'roles:read' } },
                ],
            },
        };

        expect(service.extractPermissionNames(staff)).toEqual([
            'staff:manage',
            'roles:read',
        ]);
    });

    it('returns an empty list when staff has no role permissions', () => {
        expect(service.extractPermissionNames({ role: null })).toEqual([]);
    });

    it('loads staff permissions from the database', async () => {
        permissionsRepository.findNamesByStaffId.mockResolvedValue([
            'staff:read',
        ]);

        const result = await service.getStaffPermissions('staff-1');

        expect(result).toEqual(['staff:read']);
        expect(permissionsRepository.findNamesByStaffId).toHaveBeenCalledWith(
            'staff-1',
        );
    });

    it('returns an empty list when staff has no permissions in db', async () => {
        permissionsRepository.findNamesByStaffId.mockResolvedValue([]);

        const result = await service.getStaffPermissions('staff-1');

        expect(result).toEqual([]);
    });
});
