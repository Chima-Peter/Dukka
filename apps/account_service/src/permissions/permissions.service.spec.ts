import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commonMock } from '../staff/test/common.mock.js';
import { PermissionsRepository } from './permissions.repository.js';
import { PermissionsService } from './permissions.service.js';

vi.mock('../../../../libs/common/src/index.ts', () => commonMock);

describe('PermissionsService', () => {
    let service: PermissionsService;
    let permissionsRepository: {
        findAll: ReturnType<typeof vi.fn>;
        findNamesByStaffId: ReturnType<typeof vi.fn>;
    };
    let redisService: {
        setObject: ReturnType<typeof vi.fn>;
        getObject: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        permissionsRepository = {
            findAll: vi.fn(),
            findNamesByStaffId: vi.fn(),
        };
        redisService = {
            setObject: vi.fn(),
            getObject: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PermissionsService,
                {
                    provide: PermissionsRepository,
                    useValue: permissionsRepository,
                },
                {
                    provide: commonMock.RedisService,
                    useValue: redisService,
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
                    { permission: { name: 'staff:create' } },
                    { permission: { name: 'roles:read' } },
                ],
            },
        };

        expect(service.extractPermissionNames(staff)).toEqual([
            'staff:create',
            'roles:read',
        ]);
    });

    it('returns an empty list when staff has no role permissions', () => {
        expect(service.extractPermissionNames({ role: null })).toEqual([]);
    });

    it('returns cached staff permissions when present in redis', async () => {
        redisService.getObject.mockResolvedValue(['staff:create']);

        const result = await service.getStaffPermissions('staff-1');

        expect(result).toEqual(['staff:create']);
        expect(permissionsRepository.findNamesByStaffId).not.toHaveBeenCalled();
    });

    it('loads from db and caches when redis misses', async () => {
        redisService.getObject.mockResolvedValue(null);
        permissionsRepository.findNamesByStaffId.mockResolvedValue([
            'staff:read',
        ]);
        redisService.setObject.mockResolvedValue('OK');

        const result = await service.getStaffPermissions('staff-1');

        expect(result).toEqual(['staff:read']);
        expect(redisService.setObject).toHaveBeenCalledWith(
            'staff_permissions:staff-1',
            ['staff:read'],
            3600,
        );
    });

    it('caches an empty list when staff has no permissions in db', async () => {
        redisService.getObject.mockResolvedValue(null);
        permissionsRepository.findNamesByStaffId.mockResolvedValue([]);
        redisService.setObject.mockResolvedValue('OK');

        const result = await service.getStaffPermissions('staff-1');

        expect(result).toEqual([]);
        expect(redisService.setObject).toHaveBeenCalledWith(
            'staff_permissions:staff-1',
            [],
            3600,
        );
    });
});
