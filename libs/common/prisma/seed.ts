import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import {
    DiscountType,
    Gender,
    OrderInventoryStatus,
    POINT_REASON,
    POINT_STATUS,
    PrismaClient,
    ProductStatus,
    PromotionMarketStatus,
    PromotionStatus,
    ScopeType,
    VariantStatus,
    StaffAuditAction,
    StaffInvitationStatus,
    TokenType,
    WarehouseStatus,
} from '../generated/prisma/client.js';
import { STAFF_ACCOUNT_PERMISSIONS } from '../src/permissions/staff-permissions.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is required to run the seed');
}

const schema =
    new URL(connectionString).searchParams.get('schema') ?? 'public';

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }, { schema }),
});

const SUPER_ADMIN_ROLE_NAME = 'Super Admin';
const SUPER_ADMIN_HIERARCHY = 0;
const BCRYPT_ROUNDS = 10;
const DEMO_PASSWORD = 'Password123!';
const PROMO_TARGET_PRODUCT_ID = '732b5445-5ea6-4d2a-b6f8-a9bad64893d9';

const DEFAULT_CURRENCIES = [
    { code: 'NGN', name: 'Nigerian Naira' },
    { code: 'GHS', name: 'Ghanaian Cedi' },
] as const;

const DEFAULT_MARKETS = [
    {
        name: 'Nigeria',
        code: 'NG',
        iso2: 'NG',
        iso3: 'NGA',
        currency_code: 'NGN' as const,
        cash_limit: 100_000,
    },
    {
        name: 'Ghana',
        code: 'GH',
        iso2: 'GH',
        iso3: 'GHA',
        currency_code: 'GHS' as const,
        cash_limit: 10_000,
    },
] as const;

const DEFAULT_CATEGORIES = [
    'Electronics',
    'Fashion',
    'Home & Living',
    'Beauty',
    'Sports & Outdoors',
    'Health & Wellness',
    'Baby & Kids',
    'Groceries',
    'Kitchen & Dining',
    'Furniture',
    'Automotive',
    'Books & Media',
    'Office Supplies',
    'Pet Supplies',
    'Jewelry & Accessories',
    'Shoes',
    'Bags & Luggage',
    'Phones & Tablets',
    'Computers',
    'Gaming',
    'Cameras',
    'Music Instruments',
    'Garden & Outdoor',
    'Tools & Hardware',
] as const;

/** Demo/promo products stay explicit; bulk catalog fills volume for local/dev UI. */
const BULK_PRODUCTS_PER_CATEGORY = 12;
const BULK_VARIANT_CODE_PREFIX = 'BLK';
const BULK_COLORS = [
    'Black',
    'White',
    'Navy',
    'Red',
    'Olive',
    'Beige',
    'Grey',
    'Blue',
] as const;
const BULK_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
const BULK_PRODUCT_ADJECTIVES = [
    'Urban',
    'Classic',
    'Prime',
    'Nova',
    'Apex',
    'Luxe',
    'Daily',
    'Studio',
    'Heritage',
    'Orbit',
    'Vista',
    'Pulse',
] as const;
const BULK_PRODUCT_NOUNS = [
    'Essentials',
    'Collection',
    'Series',
    'Kit',
    'Set',
    'Pack',
    'Edition',
    'Line',
    'Bundle',
    'Range',
    'Core',
    'Pro',
] as const;

const DEFAULT_ROLES = [
    {
        name: 'Platform Admin',
        description:
            'Perform platform-wide administration across markets (no review privileges)',
        hierarchy: 1,
        scope_type: ScopeType.GLOBAL,
        permission_names: [
            'platform_admin',
            'staff:manage',
            'staff:read',
            'staff:technical_support',
            'staff:read_audits',
            'roles:manage',
            'roles:read',
            'permissions:read',
            'markets:provision',
            'markets:manage',
            'markets:read',
            'currencies:manage',
            'categories:manage',
            'market_variants:manage',
            'market_variants:read',
            'warehouses:create',
            'warehouses:manage',
            'distribution_points:create',
            'distribution_points:manage',
            'service_states:manage',
            'service_states:assign',
            'inventory:manage',
            'payments:manage',
            'market_payments:manage',
            'payments:read',
            'promotions:manage',
            'promotions:read',
            'coupons:manage',
            'coupons:read',
        ],
    },
    {
        name: 'Platform Reviewer',
        description:
            'Review platform and market actions for approval or rejection (does not perform them)',
        hierarchy: 2,
        scope_type: ScopeType.GLOBAL,
        permission_names: [
            'markets:read',
            'permissions:read',
            'products:review',
            'promotions:read',
            'promotions:review',
            'coupons:read',
            'coupons:review',
            'payments:read',
            'payments:review',
        ],
    },
    {
        name: 'Catalog Editor',
        description:
            'Perform catalog actions: create and propose product/variant changes',
        hierarchy: 3,
        scope_type: ScopeType.GLOBAL,
        permission_names: ['products:manage'],
    },
    {
        name: 'Catalog Reviewer',
        description:
            'Review catalog actions: approve or reject products, variants, and pending updates',
        hierarchy: 4,
        scope_type: ScopeType.GLOBAL,
        permission_names: ['products:review'],
    },
    {
        name: 'Payments Admin',
        description: 'Perform payment-method setup (create payment methods)',
        hierarchy: 5,
        scope_type: ScopeType.GLOBAL,
        permission_names: ['payments:manage', 'payments:read'],
    },
    {
        name: 'Warehouse Manager',
        description: 'Manage warehouses, inventory, and fulfillment',
        hierarchy: 1,
        scope_type: ScopeType.WAREHOUSE,
        permission_names: [
            'warehouses:manage',
            'service_states:assign',
            'inventory:manage',
            'market_variants:read',
            'staff:read',
        ],
    },
    {
        name: 'Market Admin',
        description:
            'Perform market administration (staff, catalog links, promotions, coupons)',
        hierarchy: 1,
        scope_type: ScopeType.MARKET,
        permission_names: [
            'market_admin',
            'staff:manage',
            'staff:read',
            'staff:technical_support',
            'staff:read_audits',
            'roles:manage',
            'roles:read',
            'markets:read',
            'markets:manage',
            'categories:manage',
            'market_variants:manage',
            'warehouses:create',
            'distribution_points:create',
            'service_states:manage',
            'promotions:manage',
            'promotions:read',
            'coupons:manage',
            'coupons:read',
            'market_payments:manage',
            'payments:read',
            'permissions:read',
        ],
    },
    {
        name: 'Market Reviewer',
        description:
            'Review market actions for approval or rejection (does not perform them)',
        hierarchy: 2,
        scope_type: ScopeType.MARKET,
        permission_names: [
            'markets:read',
            'products:review',
            'promotions:read',
            'promotions:review',
            'coupons:read',
            'coupons:review',
            'payments:read',
            'payments:review',
            'permissions:read',
        ],
    },
    {
        name: 'Support Agent',
        description: 'Customer support and staff lookups',
        hierarchy: 3,
        scope_type: ScopeType.MARKET,
        permission_names: [
            'technical_support',
            'staff:read',
            'staff:technical_support',
            'markets:read',
            'market_variants:manage',
            'payments:read',
            'promotions:read',
            'coupons:read',
            'permissions:read',
        ],
    },
] as const;

async function seedPermissions() {
    const desiredKeys = new Set(
        STAFF_ACCOUNT_PERMISSIONS.map(
            (permission) => `${permission.name}:${permission.scope_type}`,
        ),
    );

    for (const permission of STAFF_ACCOUNT_PERMISSIONS) {
        await prisma.permission.upsert({
            where: {
                name_scope_type: {
                    name: permission.name,
                    scope_type: permission.scope_type,
                },
            },
            create: {
                name: permission.name,
                description: permission.description,
                scope_type: permission.scope_type,
            },
            update: {
                description: permission.description,
            },
        });
    }

    const existing = await prisma.permission.findMany({
        select: { id: true, name: true, scope_type: true },
    });
    const obsolete = existing.filter(
        (row) => !desiredKeys.has(`${row.name}:${row.scope_type}`),
    );
    if (obsolete.length > 0) {
        await prisma.rolePermission.deleteMany({
            where: { permission_id: { in: obsolete.map((row) => row.id) } },
        });
        await prisma.permission.deleteMany({
            where: { id: { in: obsolete.map((row) => row.id) } },
        });
        console.log(
            `Removed ${obsolete.length} obsolete permission(s): ${obsolete
                .map((row) => `${row.name}:${row.scope_type}`)
                .join(', ')}`,
        );
    }

    console.log(
        `Seeded ${STAFF_ACCOUNT_PERMISSIONS.length} staff account permissions`,
    );
}

async function seedCurrencies() {
    for (const currency of DEFAULT_CURRENCIES) {
        await prisma.currency.upsert({
            where: { code: currency.code },
            create: {
                code: currency.code,
                name: currency.name,
                is_active: true,
            },
            update: {
                name: currency.name,
                is_active: true,
            },
        });
    }

    console.log(`Seeded ${DEFAULT_CURRENCIES.length} currencies`);
}

async function seedMarkets() {
    for (const market of DEFAULT_MARKETS) {
        const currency = await prisma.currency.findUniqueOrThrow({
            where: { code: market.currency_code },
        });

        await prisma.market.upsert({
            where: { code: market.code },
            create: {
                name: market.name,
                code: market.code,
                iso2: market.iso2,
                iso3: market.iso3,
                currency_id: currency.id,
                cash_limit: market.cash_limit,
                status: 'OPEN',
            },
            update: {
                name: market.name,
                iso2: market.iso2,
                iso3: market.iso3,
                currency_id: currency.id,
                cash_limit: market.cash_limit,
                status: 'OPEN',
            },
        });
    }

    console.log(`Seeded ${DEFAULT_MARKETS.length} markets`);
}

async function seedSuperAdminRole() {
    const role = await prisma.role.upsert({
        where: { name: SUPER_ADMIN_ROLE_NAME },
        create: {
            name: SUPER_ADMIN_ROLE_NAME,
            description: 'Full access across all markets and permissions',
            hierarchy: SUPER_ADMIN_HIERARCHY,
            scope_type: ScopeType.GLOBAL,
        },
        update: {
            description: 'Full access across all markets and permissions',
            hierarchy: SUPER_ADMIN_HIERARCHY,
            scope_type: ScopeType.GLOBAL,
        },
    });

    const permissions = await prisma.permission.findMany({
        where: { scope_type: ScopeType.GLOBAL },
        select: { id: true },
    });
    await prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({
            role_id: role.id,
            permission_id: permission.id,
        })),
        skipDuplicates: true,
    });

    console.log(
        `Seeded ${SUPER_ADMIN_ROLE_NAME} with ${permissions.length} GLOBAL permission(s)`,
    );

    return role;
}

async function seedAdditionalRoles() {
    const allPermissions = await prisma.permission.findMany({
        select: { id: true, name: true, scope_type: true },
    });
    const permissionByNameAndScope = new Map(
        allPermissions.map((permission) => [
            `${permission.name}:${permission.scope_type}`,
            permission.id,
        ]),
    );
    const roles: { id: string; name: string }[] = [];

    for (const roleDef of DEFAULT_ROLES) {
        const role = await prisma.role.upsert({
            where: { name: roleDef.name },
            create: {
                name: roleDef.name,
                description: roleDef.description,
                hierarchy: roleDef.hierarchy,
                scope_type: roleDef.scope_type,
            },
            update: {
                description: roleDef.description,
                hierarchy: roleDef.hierarchy,
                scope_type: roleDef.scope_type,
            },
        });

        const permissionIds = roleDef.permission_names
            .map((name) =>
                permissionByNameAndScope.get(`${name}:${roleDef.scope_type}`),
            )
            .filter((id): id is string => id !== undefined);

        if (permissionIds.length > 0) {
            await prisma.rolePermission.createMany({
                data: permissionIds.map((permission_id) => ({
                    role_id: role.id,
                    permission_id,
                })),
                skipDuplicates: true,
            });
        }

        roles.push(role);
    }

    console.log(`Seeded ${roles.length} additional role(s)`);
    return roles;
}

async function seedSuperAdminStaff(role_id: string) {
    const email =
        process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@dukka.local';
    const name = process.env.SUPER_ADMIN_NAME ?? 'Super Admin';
    const password =
        process.env.SUPER_ADMIN_PASSWORD ?? 'ChangeMe!SuperAdmin1';

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const staff = await prisma.staff.upsert({
        where: { email },
        create: {
            name,
            email,
            password: hashedPassword,
            staff_number: 'STF-SUPERADMIN',
            role_id,
            is_active: true,
            phone_number: '+2348000000001',
        },
        update: {
            name,
            password: hashedPassword,
            role_id,
            is_active: true,
            phone_number: '+2348000000001',
        },
    });

    await prisma.staffScope.createMany({
        data: [
            {
                staff_id: staff.id,
                scope_type: ScopeType.GLOBAL,
                market_id: null,
            },
        ],
        skipDuplicates: true,
    });

    await prisma.staffProfile.upsert({
        where: { staff_id: staff.id },
        create: {
            staff_id: staff.id,
            job_title: 'Platform Super Admin',
            bio: 'Owns platform configuration and elevated access.',
            gender: Gender.OTHER,
            hire_date: new Date('2024-01-01'),
            address: 'Lagos, Nigeria',
        },
        update: {
            job_title: 'Platform Super Admin',
            bio: 'Owns platform configuration and elevated access.',
        },
    });

    await prisma.staffToken.upsert({
        where: { token: 'seed-superadmin-access-token' },
        create: {
            token: 'seed-superadmin-access-token',
            type: TokenType.ACCESS,
            staffId: staff.id,
        },
        update: {
            type: TokenType.ACCESS,
            staffId: staff.id,
        },
    });

    console.log(
        `Seeded super admin staff ${staff.email} with GLOBAL scope`,
    );

    return staff;
}

async function seedDemoStaff(
    roles: { id: string; name: string }[],
    markets: { id: string; code: string }[],
    invitedByStaffId: string,
) {
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
    const warehouseRole = roles.find((role) => role.name === 'Warehouse Manager');
    const supportRole = roles.find((role) => role.name === 'Support Agent');
    const ngMarket = markets.find((market) => market.code === 'NG');
    const ghMarket = markets.find((market) => market.code === 'GH');

    if (!warehouseRole || !supportRole || !ngMarket || !ghMarket) {
        throw new Error('Missing roles or markets for demo staff seed');
    }

    const demoStaff = [
        {
            email: 'warehouse.ng@dukka.local',
            name: 'Ada Okonkwo',
            staff_number: 'STF-WAREHOUSENG',
            phone_number: '+2348011111111',
            role_id: warehouseRole.id,
            market_ids: [ngMarket.id],
            profile: {
                job_title: 'Lagos Warehouse Manager',
                bio: 'Oversees Lagos fulfillment operations.',
                gender: Gender.FEMALE,
                date_of_birth: new Date('1990-05-12'),
                hire_date: new Date('2024-03-15'),
                address: 'Ikeja, Lagos',
            },
            qualifications: [
                {
                    title: 'Logistics Certificate',
                    description: 'Certified warehouse operations lead',
                    document_url: 'https://cdn.dukka.local/docs/ada-logistics.pdf',
                },
            ],
        },
        {
            email: 'support.gh@dukka.local',
            name: 'Kwame Mensah',
            staff_number: 'STF-SUPPORTGH',
            phone_number: '+233201111111',
            role_id: supportRole.id,
            market_ids: [ghMarket.id, ngMarket.id],
            profile: {
                job_title: 'Customer Support Agent',
                bio: 'Handles order and account inquiries.',
                gender: Gender.MALE,
                hire_date: new Date('2024-06-01'),
                address: 'Accra, Ghana',
            },
            qualifications: [
                {
                    title: 'Customer Success Training',
                    description: 'Completed Dukka support academy',
                    document_url: 'https://cdn.dukka.local/docs/kwame-cs.pdf',
                },
            ],
        },
    ] as const;

    const createdStaff: { id: string; email: string; name: string }[] = [];

    for (const staffDef of demoStaff) {
        const staff = await prisma.staff.upsert({
            where: { email: staffDef.email },
            create: {
                name: staffDef.name,
                email: staffDef.email,
                password: hashedPassword,
                staff_number: staffDef.staff_number,
                phone_number: staffDef.phone_number,
                role_id: staffDef.role_id,
                is_active: true,
            },
            update: {
                name: staffDef.name,
                password: hashedPassword,
                phone_number: staffDef.phone_number,
                role_id: staffDef.role_id,
                is_active: true,
            },
        });

        await prisma.staffScope.createMany({
            data: staffDef.market_ids.map((market_id) => ({
                staff_id: staff.id,
                scope_type: ScopeType.MARKET,
                market_id,
            })),
            skipDuplicates: true,
        });

        await prisma.staffProfile.upsert({
            where: { staff_id: staff.id },
            create: {
                staff_id: staff.id,
                ...staffDef.profile,
            },
            update: { ...staffDef.profile },
        });

        const existingQualifications = await prisma.qualification.count({
            where: { staff_id: staff.id },
        });
        if (existingQualifications === 0) {
            await prisma.qualification.createMany({
                data: staffDef.qualifications.map((qualification) => ({
                    staff_id: staff.id,
                    ...qualification,
                })),
            });
        }

        await prisma.staffToken.upsert({
            where: { token: `seed-staff-refresh-${staff.email}` },
            create: {
                token: `seed-staff-refresh-${staff.email}`,
                type: TokenType.REFRESH,
                staffId: staff.id,
            },
            update: {
                type: TokenType.REFRESH,
                staffId: staff.id,
            },
        });

        createdStaff.push(staff);
    }

    const pendingInvitation = await prisma.staffInvitation.upsert({
        where: { token: 'seed-invitation-pending-token' },
        create: {
            email: 'new.hire@dukka.local',
            name: 'Chidi Eze',
            phone_number: '+2348022222222',
            token: 'seed-invitation-pending-token',
            status: StaffInvitationStatus.PENDING,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            role_id: supportRole.id,
            invited_by_staff_id: invitedByStaffId,
        },
        update: {
            email: 'new.hire@dukka.local',
            name: 'Chidi Eze',
            status: StaffInvitationStatus.PENDING,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            role_id: supportRole.id,
            invited_by_staff_id: invitedByStaffId,
        },
    });

    await prisma.staffInvitationScope.createMany({
        data: [
            {
                invitation_id: pendingInvitation.id,
                scope_type: ScopeType.MARKET,
                market_id: ngMarket.id,
            },
        ],
        skipDuplicates: true,
    });

    const acceptedStaff = createdStaff[0];
    const acceptedInvitation = await prisma.staffInvitation.upsert({
        where: { token: 'seed-invitation-accepted-token' },
        create: {
            email: acceptedStaff.email,
            name: acceptedStaff.name,
            phone_number: '+2348011111111',
            token: 'seed-invitation-accepted-token',
            status: StaffInvitationStatus.ACCEPTED,
            expires_at: new Date('2024-04-01'),
            accepted_at: new Date('2024-03-10'),
            role_id: warehouseRole.id,
            invited_by_staff_id: invitedByStaffId,
            staff_id: acceptedStaff.id,
        },
        update: {
            status: StaffInvitationStatus.ACCEPTED,
            accepted_at: new Date('2024-03-10'),
            role_id: warehouseRole.id,
            invited_by_staff_id: invitedByStaffId,
            staff_id: acceptedStaff.id,
        },
    });

    await prisma.staffInvitationScope.createMany({
        data: [
            {
                invitation_id: acceptedInvitation.id,
                scope_type: ScopeType.MARKET,
                market_id: ngMarket.id,
            },
        ],
        skipDuplicates: true,
    });

    const auditCount = await prisma.staffAudit.count({
        where: { performed_by_staff_id: invitedByStaffId },
    });
    if (auditCount === 0) {
        await prisma.staffAudit.createMany({
            data: [
                {
                    action: StaffAuditAction.STAFF_CREATED,
                    staff_id: acceptedStaff.id,
                    staff_name: acceptedStaff.name,
                    performed_by_staff_id: invitedByStaffId,
                    performed_by_staff_name: 'Super Admin',
                    role_id: warehouseRole.id,
                    role_name: warehouseRole.name,
                },
                {
                    action: StaffAuditAction.SCOPE_ASSIGNED,
                    staff_id: acceptedStaff.id,
                    staff_name: acceptedStaff.name,
                    performed_by_staff_id: invitedByStaffId,
                    performed_by_staff_name: 'Super Admin',
                    market_id: ngMarket.id,
                    market_name: 'Nigeria',
                },
                {
                    action: StaffAuditAction.ROLE_ASSIGNED,
                    staff_id: createdStaff[1].id,
                    staff_name: createdStaff[1].name,
                    performed_by_staff_id: invitedByStaffId,
                    performed_by_staff_name: 'Super Admin',
                    role_id: supportRole.id,
                    role_name: supportRole.name,
                },
            ],
        });
    }

    console.log(
        `Seeded ${createdStaff.length} demo staff, invitations, and audit rows`,
    );

    return createdStaff;
}

async function seedCustomers() {
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

    const customersDef = [
        {
            email: 'adaeze.customer@dukka.local',
            name: 'Adaeze Nnamdi',
            phone_number: '+2348033333333',
            gender: Gender.FEMALE,
            date_of_birth: new Date('1995-08-20'),
            points_balance: 250,
            points_history: [
                {
                    status: POINT_STATUS.EARNED,
                    description: POINT_REASON.REGISTERED,
                    count: 50,
                },
                {
                    status: POINT_STATUS.EARNED,
                    description: POINT_REASON.PLACE_ORDER,
                    count: 200,
                },
                {
                    status: POINT_STATUS.REDEEMED,
                    description: POINT_REASON.COMPLETE_ORDER,
                    count: 0,
                },
            ],
        },
        {
            email: 'kofi.customer@dukka.local',
            name: 'Kofi Asante',
            phone_number: '+233202222222',
            gender: Gender.MALE,
            date_of_birth: new Date('1992-02-11'),
            points_balance: 120,
            points_history: [
                {
                    status: POINT_STATUS.EARNED,
                    description: POINT_REASON.REGISTERED,
                    count: 50,
                },
                {
                    status: POINT_STATUS.EARNED,
                    description: POINT_REASON.SUBSCRIBED,
                    count: 70,
                },
            ],
        },
    ] as const;

    const customers: { id: string; email: string; name: string }[] = [];

    for (const customerDef of customersDef) {
        const customer = await prisma.customer.upsert({
            where: { email: customerDef.email },
            create: {
                name: customerDef.name,
                email: customerDef.email,
                password: hashedPassword,
                phone_number: customerDef.phone_number,
                gender: customerDef.gender,
                date_of_birth: customerDef.date_of_birth,
                avatar: `https://cdn.dukka.local/avatars/${customerDef.email}.png`,
            },
            update: {
                name: customerDef.name,
                password: hashedPassword,
                phone_number: customerDef.phone_number,
                gender: customerDef.gender,
                date_of_birth: customerDef.date_of_birth,
            },
        });

        await prisma.token.upsert({
            where: { token: `seed-customer-access-${customer.email}` },
            create: {
                token: `seed-customer-access-${customer.email}`,
                type: TokenType.ACCESS,
                customerId: customer.id,
            },
            update: {
                type: TokenType.ACCESS,
                customerId: customer.id,
            },
        });

        await prisma.token.upsert({
            where: { token: `seed-customer-refresh-${customer.email}` },
            create: {
                token: `seed-customer-refresh-${customer.email}`,
                type: TokenType.REFRESH,
                customerId: customer.id,
            },
            update: {
                type: TokenType.REFRESH,
                customerId: customer.id,
            },
        });

        const points = await prisma.points.upsert({
            where: { customer_id: customer.id },
            create: {
                customer_id: customer.id,
                balance: customerDef.points_balance,
            },
            update: {
                balance: customerDef.points_balance,
            },
        });

        const historyCount = await prisma.pointsHistory.count({
            where: { points_id: points.id },
        });
        if (historyCount === 0) {
            await prisma.pointsHistory.createMany({
                data: customerDef.points_history.map((entry) => ({
                    points_id: points.id,
                    status: entry.status,
                    description: entry.description,
                    count: entry.count,
                })),
            });
        }

        customers.push(customer);
    }

    console.log(`Seeded ${customers.length} customer(s) with points`);
    return customers;
}

async function seedShippingAddresses(
    customers: { id: string; email: string }[],
    markets: { id: string; code: string }[],
) {
    const shippingDefs = [
        {
            customer_email: 'adaeze.customer@dukka.local',
            first_name: 'Adaeze',
            last_name: 'Nnamdi',
            email: 'ship.adaeze@dukka.local',
            phone_number: '+2348033333333',
            whatsapp_number: '+2348033333333',
            country: 'Nigeria',
            market_code: 'NG',
            state_name: 'Lagos',
            street_address: '12 Admiralty Way, Lekki',
        },
        {
            customer_email: 'kofi.customer@dukka.local',
            first_name: 'Kofi',
            last_name: 'Asante',
            email: 'ship.kofi@dukka.local',
            phone_number: '+233202222222',
            whatsapp_number: '+233202222222',
            country: 'Ghana',
            market_code: 'GH',
            state_name: 'Greater Accra',
            street_address: '45 Independence Ave, Accra',
        },
    ] as const;

    let created = 0;

    for (const shipping of shippingDefs) {
        const customer = customers.find(
            (row) => row.email === shipping.customer_email,
        );
        const market = markets.find((row) => row.code === shipping.market_code);
        if (!customer || !market) {
            continue;
        }

        const serviceState = await prisma.serviceState.findUnique({
            where: {
                market_id_state_name: {
                    market_id: market.id,
                    state_name: shipping.state_name,
                },
            },
            select: { id: true },
        });
        if (!serviceState) {
            throw new Error(
                `Missing service state ${shipping.state_name} for market ${shipping.market_code}`,
            );
        }

        const existingAddress = await prisma.shippingAddress.findFirst({
            where: {
                email: shipping.email,
                customer_id: customer.id,
            },
        });
        if (existingAddress) {
            continue;
        }

        await prisma.shippingAddress.create({
            data: {
                first_name: shipping.first_name,
                last_name: shipping.last_name,
                email: shipping.email,
                phone_number: shipping.phone_number,
                whatsapp_number: shipping.whatsapp_number,
                country: shipping.country,
                street_address: shipping.street_address,
                state: serviceState.id,
                market_id: market.id,
                customer_id: customer.id,
            },
        });
        created += 1;
    }

    console.log(`Seeded ${created} shipping address(es)`);
}

async function seedBillingAddresses(
    customers: { id: string; email: string }[],
    markets: { id: string; code: string }[],
) {
    const billingDefs = [
        {
            customer_email: 'adaeze.customer@dukka.local',
            first_name: 'Adaeze',
            last_name: 'Nnamdi',
            email: 'bill.adaeze@dukka.local',
            phone_number: '+2348033333333',
            whatsapp_number: '+2348033333333',
            country: 'Nigeria',
            market_code: 'NG',
            state_name: 'Lagos',
            street_address: '12 Admiralty Way, Lekki',
        },
        {
            customer_email: 'kofi.customer@dukka.local',
            first_name: 'Kofi',
            last_name: 'Asante',
            email: 'bill.kofi@dukka.local',
            phone_number: '+233202222222',
            whatsapp_number: '+233202222222',
            country: 'Ghana',
            market_code: 'GH',
            state_name: 'Greater Accra',
            street_address: '45 Independence Ave, Accra',
        },
    ] as const;

    let created = 0;

    for (const billing of billingDefs) {
        const customer = customers.find(
            (row) => row.email === billing.customer_email,
        );
        const market = markets.find((row) => row.code === billing.market_code);
        if (!customer || !market) {
            continue;
        }

        const serviceState = await prisma.serviceState.findUnique({
            where: {
                market_id_state_name: {
                    market_id: market.id,
                    state_name: billing.state_name,
                },
            },
            select: { id: true },
        });
        if (!serviceState) {
            throw new Error(
                `Missing service state ${billing.state_name} for market ${billing.market_code}`,
            );
        }

        const existingAddress = await prisma.billingAddress.findFirst({
            where: {
                email: billing.email,
                customer_id: customer.id,
            },
        });
        if (existingAddress) {
            continue;
        }

        await prisma.billingAddress.create({
            data: {
                first_name: billing.first_name,
                last_name: billing.last_name,
                email: billing.email,
                phone_number: billing.phone_number,
                whatsapp_number: billing.whatsapp_number,
                country: billing.country,
                street_address: billing.street_address,
                state: serviceState.id,
                market_id: market.id,
                customer_id: customer.id,
            },
        });
        created += 1;
    }

    console.log(`Seeded ${created} billing address(es)`);
}

function slugifyCategory(name: string): string {
    return name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '')
        .slice(0, 8);
}

function bulkPriceForMarket(
    marketCode: string,
    categoryIndex: number,
    productIndex: number,
    variantIndex: number,
): { price: number; currency: string } {
    const base =
        5_000 +
        categoryIndex * 1_250 +
        productIndex * 375 +
        variantIndex * 250;
    if (marketCode === 'GH') {
        return {
            price: Math.max(25, Math.round(base / 90)),
            currency: 'GHS',
        };
    }
    return { price: base, currency: 'NGN' };
}

function buildBulkCatalogDefs(
    categories: { id: string; name: string }[],
): {
    name: string;
    description: string;
    specs: Record<string, unknown>;
    status: ProductStatus;
    category_id: string;
    images: { image_url: string; sort_order: number }[];
    variants: {
        variant_code: string;
        color: string;
        size: string | null;
        variant_info: Record<string, unknown>;
        image_url: string;
        markets: { market_code: string; price: number; currency: string }[];
    }[];
}[] {
    const defs: ReturnType<typeof buildBulkCatalogDefs> = [];
    const sizedCategories = new Set([
        'Fashion',
        'Shoes',
        'Sports & Outdoors',
        'Baby & Kids',
        'Jewelry & Accessories',
        'Bags & Luggage',
    ]);

    for (const [categoryIndex, category] of categories.entries()) {
        const categorySlug = slugifyCategory(category.name);

        for (
            let productIndex = 0;
            productIndex < BULK_PRODUCTS_PER_CATEGORY;
            productIndex += 1
        ) {
            const adjective =
                BULK_PRODUCT_ADJECTIVES[
                    productIndex % BULK_PRODUCT_ADJECTIVES.length
                ];
            const noun =
                BULK_PRODUCT_NOUNS[productIndex % BULK_PRODUCT_NOUNS.length];
            const productNumber = String(productIndex + 1).padStart(2, '0');
            const productName = `${adjective} ${category.name} ${noun} ${productNumber}`;
            const productSlug = `${categorySlug}${productNumber}`;
            const status =
                productIndex % 17 === 0
                    ? ProductStatus.PENDING_REVIEW
                    : productIndex % 23 === 0
                      ? ProductStatus.ARCHIVED
                      : ProductStatus.ACTIVE;

            const variantCount = 2 + (productIndex % 3);
            const variants = Array.from({ length: variantCount }, (_, variantIndex) => {
                const color =
                    BULK_COLORS[(categoryIndex + productIndex + variantIndex) % BULK_COLORS.length];
                const usesSize = sizedCategories.has(category.name);
                const size = usesSize
                    ? BULK_SIZES[(productIndex + variantIndex) % BULK_SIZES.length]
                    : null;
                const colorSlug = color.slice(0, 3).toUpperCase();
                const sizeSlug = size ?? 'ONE';
                const variant_code = `${BULK_VARIANT_CODE_PREFIX}-${productSlug}-${colorSlug}-${sizeSlug}-${variantIndex + 1}`;
                const markets =
                    variantIndex === variantCount - 1 && productIndex % 5 === 0
                        ? [
                              {
                                  market_code: 'NG',
                                  ...bulkPriceForMarket(
                                      'NG',
                                      categoryIndex,
                                      productIndex,
                                      variantIndex,
                                  ),
                              },
                          ]
                        : [
                              {
                                  market_code: 'NG',
                                  ...bulkPriceForMarket(
                                      'NG',
                                      categoryIndex,
                                      productIndex,
                                      variantIndex,
                                  ),
                              },
                              {
                                  market_code: 'GH',
                                  ...bulkPriceForMarket(
                                      'GH',
                                      categoryIndex,
                                      productIndex,
                                      variantIndex,
                                  ),
                              },
                          ];

                return {
                    variant_code,
                    color,
                    size,
                    variant_info: {
                        sku: variant_code,
                        seed_batch: 'catalog-bulk-v1',
                    },
                    image_url: `https://cdn.dukka.local/variants/${variant_code.toLowerCase()}.jpg`,
                    markets,
                };
            });

            defs.push({
                name: productName,
                description: `${adjective} ${category.name.toLowerCase()} product for everyday use. Seeded bulk catalog item ${productNumber}.`,
                specs: {
                    seed_batch: 'catalog-bulk-v1',
                    category: category.name,
                    weight_kg: Number(
                        (0.2 + ((productIndex + categoryIndex) % 10) * 0.15).toFixed(2),
                    ),
                    warranty_months: 6 + (productIndex % 4) * 6,
                },
                status,
                category_id: category.id,
                images: [
                    {
                        image_url: `https://cdn.dukka.local/products/${productSlug.toLowerCase()}-1.jpg`,
                        sort_order: 0,
                    },
                    {
                        image_url: `https://cdn.dukka.local/products/${productSlug.toLowerCase()}-2.jpg`,
                        sort_order: 1,
                    },
                ],
                variants,
            });
        }
    }

    return defs;
}

async function upsertCatalogProduct(params: {
    id?: string;
    name: string;
    description: string;
    specs: Record<string, unknown>;
    status: ProductStatus;
    category_id: string;
    images: { image_url: string; sort_order: number }[];
    variants: {
        variant_code: string;
        color: string;
        size: string | null;
        variant_info: Record<string, unknown>;
        image_url?: string;
        markets: { market_code: string; price: number; currency: string }[];
    }[];
    marketByCode: Map<string, { id: string; code: string }>;
    seededMarketVariants: {
        id: string;
        variant_code: string;
        market_code: string;
    }[];
}) {
    let product = params.id
        ? await prisma.product.findUnique({ where: { id: params.id } })
        : await prisma.product.findFirst({
              where: {
                  name: params.name,
                  category_id: params.category_id,
              },
          });

    if (!product) {
        product = await prisma.product.create({
            data: {
                ...(params.id !== undefined && { id: params.id }),
                name: params.name,
                description: params.description,
                specs: params.specs,
                status: params.status,
                category_id: params.category_id,
                images: {
                    create: params.images.map((image) => ({
                        image_url: image.image_url,
                        sort_order: image.sort_order,
                    })),
                },
            },
        });
    } else {
        product = await prisma.product.update({
            where: { id: product.id },
            data: {
                name: params.name,
                description: params.description,
                specs: params.specs,
                status: params.status,
                category_id: params.category_id,
            },
        });

        const imageCount = await prisma.productImage.count({
            where: { product_id: product.id },
        });
        if (imageCount === 0 && params.images.length > 0) {
            await prisma.productImage.createMany({
                data: params.images.map((image) => ({
                    product_id: product!.id,
                    image_url: image.image_url,
                    sort_order: image.sort_order,
                })),
            });
        }
    }

    for (const variantDef of params.variants) {
        const variantStatus =
            variantDef.markets.length > 0
                ? VariantStatus.ACTIVE
                : VariantStatus.PENDING_REVIEW;
        const variant = await prisma.variant.upsert({
            where: { variant_code: variantDef.variant_code },
            create: {
                variant_code: variantDef.variant_code,
                color: variantDef.color,
                size: variantDef.size,
                variant_info: variantDef.variant_info,
                status: variantStatus,
                product_id: product.id,
                ...(variantDef.image_url !== undefined && {
                    image: {
                        create: { image_url: variantDef.image_url },
                    },
                }),
            },
            update: {
                color: variantDef.color,
                size: variantDef.size,
                variant_info: variantDef.variant_info,
                status: variantStatus,
                product_id: product.id,
            },
        });

        if (variantDef.image_url !== undefined) {
            await prisma.variantImage.upsert({
                where: { variant_id: variant.id },
                create: {
                    variant_id: variant.id,
                    image_url: variantDef.image_url,
                },
                update: {
                    image_url: variantDef.image_url,
                },
            });
        }

        for (const marketPrice of variantDef.markets) {
            const market = params.marketByCode.get(marketPrice.market_code);
            if (!market) {
                continue;
            }

            const marketVariant = await prisma.marketVariant.upsert({
                where: {
                    market_id_variant_id: {
                        market_id: market.id,
                        variant_id: variant.id,
                    },
                },
                create: {
                    market_id: market.id,
                    variant_id: variant.id,
                    price: marketPrice.price,
                    currency: marketPrice.currency,
                    sold_out: false,
                    status: 'ACTIVE',
                },
                update: {
                    price: marketPrice.price,
                    currency: marketPrice.currency,
                    sold_out: false,
                    status: 'ACTIVE',
                },
            });

            params.seededMarketVariants.push({
                id: marketVariant.id,
                variant_code: variantDef.variant_code,
                market_code: marketPrice.market_code,
            });
        }
    }

    return product;
}

async function seedCatalog(markets: { id: string; code: string }[]) {
    for (const categoryName of DEFAULT_CATEGORIES) {
        await prisma.category.upsert({
            where: { name: categoryName },
            create: { name: categoryName },
            update: {},
        });
    }

    const categories = await prisma.category.findMany({
        where: { name: { in: [...DEFAULT_CATEGORIES] } },
        orderBy: { name: 'asc' },
    });

    for (const market of markets) {
        for (const category of categories) {
            await prisma.marketCategory.upsert({
                where: {
                    market_id_category_id: {
                        market_id: market.id,
                        category_id: category.id,
                    },
                },
                create: {
                    market_id: market.id,
                    category_id: category.id,
                },
                update: {},
            });
        }
    }

    const electronics = categories.find((row) => row.name === 'Electronics');
    const fashion = categories.find((row) => row.name === 'Fashion');

    if (!electronics || !fashion) {
        throw new Error('Failed to resolve categories for product seed');
    }

    const productsDef = [
        {
            id: PROMO_TARGET_PRODUCT_ID,
            name: 'Dukka Pulse Headphones',
            description: 'Wireless over-ear headphones with ANC.',
            specs: { battery_hours: 30, connectivity: 'Bluetooth 5.3' },
            status: ProductStatus.ACTIVE,
            category_id: electronics.id,
            images: [
                {
                    image_url: 'https://cdn.dukka.local/products/pulse-1.jpg',
                    sort_order: 0,
                },
                {
                    image_url: 'https://cdn.dukka.local/products/pulse-2.jpg',
                    sort_order: 1,
                },
            ],
            variants: [
                {
                    variant_code: 'PULSE-BLK-STD',
                    color: 'Black',
                    size: 'Standard',
                    variant_info: { sku: 'PULSE-BLK-STD' },
                    image_url: 'https://cdn.dukka.local/variants/pulse-blk.jpg',
                    markets: [
                        { market_code: 'NG', price: 85000, currency: 'NGN' },
                        { market_code: 'GH', price: 950, currency: 'GHS' },
                    ],
                },
                {
                    variant_code: 'PULSE-WHT-STD',
                    color: 'White',
                    size: 'Standard',
                    variant_info: { sku: 'PULSE-WHT-STD' },
                    image_url: 'https://cdn.dukka.local/variants/pulse-wht.jpg',
                    markets: [
                        { market_code: 'NG', price: 87000, currency: 'NGN' },
                    ],
                },
            ],
        },
        {
            name: 'Ankara Everyday Tee',
            description: 'Soft cotton tee with contemporary Ankara print.',
            specs: { material: '100% cotton', fit: 'Regular' },
            status: ProductStatus.ACTIVE,
            category_id: fashion.id,
            images: [
                {
                    image_url: 'https://cdn.dukka.local/products/ankara-tee-1.jpg',
                    sort_order: 0,
                },
            ],
            variants: [
                {
                    variant_code: 'ANK-TEE-M',
                    color: 'Multicolor',
                    size: 'M',
                    variant_info: { sku: 'ANK-TEE-M' },
                    image_url: 'https://cdn.dukka.local/variants/ank-tee-m.jpg',
                    markets: [
                        { market_code: 'NG', price: 15000, currency: 'NGN' },
                    ],
                },
                {
                    variant_code: 'ANK-TEE-L',
                    color: 'Multicolor',
                    size: 'L',
                    variant_info: { sku: 'ANK-TEE-L' },
                    markets: [
                        { market_code: 'NG', price: 15000, currency: 'NGN' },
                    ],
                },
            ],
        },
        {
            name: 'Accra Charge Hub',
            description: 'Compact USB-C charging hub for home desks.',
            specs: { ports: 6, wattage: 65 },
            status: ProductStatus.PENDING_REVIEW,
            category_id: electronics.id,
            images: [
                {
                    image_url: 'https://cdn.dukka.local/products/charge-hub-1.jpg',
                    sort_order: 0,
                },
            ],
            variants: [
                {
                    variant_code: 'CHARGE-HUB-GRY',
                    color: 'Grey',
                    size: null,
                    variant_info: { sku: 'CHARGE-HUB-GRY' },
                    image_url: 'https://cdn.dukka.local/variants/charge-hub.jpg',
                    markets: [
                        { market_code: 'GH', price: 420, currency: 'GHS' },
                    ],
                },
            ],
        },
    ] as const;

    const marketByCode = new Map(markets.map((market) => [market.code, market]));
    const seededMarketVariants: {
        id: string;
        variant_code: string;
        market_code: string;
    }[] = [];

    for (const productDef of productsDef) {
        await upsertCatalogProduct({
            ...productDef,
            specs: { ...productDef.specs },
            images: [...productDef.images],
            variants: productDef.variants.map((variant) => ({
                ...variant,
                variant_info: { ...variant.variant_info },
                markets: [...variant.markets],
            })),
            marketByCode,
            seededMarketVariants,
        });
    }

    const bulkDefs = buildBulkCatalogDefs(categories);
    const expectedBulkVariants = bulkDefs.reduce(
        (sum, product) => sum + product.variants.length,
        0,
    );
    const existingBulkVariants = await prisma.variant.count({
        where: { variant_code: { startsWith: `${BULK_VARIANT_CODE_PREFIX}-` } },
    });

    let bulkProductCount = 0;
    if (existingBulkVariants === expectedBulkVariants) {
        const existing = await prisma.marketVariant.findMany({
            where: {
                variant: {
                    variant_code: {
                        startsWith: `${BULK_VARIANT_CODE_PREFIX}-`,
                    },
                },
            },
            select: {
                id: true,
                market: { select: { code: true } },
                variant: { select: { variant_code: true } },
            },
        });
        for (const row of existing) {
            seededMarketVariants.push({
                id: row.id,
                variant_code: row.variant.variant_code,
                market_code: row.market.code,
            });
        }
        bulkProductCount = await prisma.product.count({
            where: {
                specs: {
                    path: ['seed_batch'],
                    equals: 'catalog-bulk-v1',
                },
            },
        });
        console.log(
            `Bulk catalog already present (${existingBulkVariants} variants); reusing existing rows`,
        );
    } else {
        if (existingBulkVariants > 0) {
            const deleted = await prisma.product.deleteMany({
                where: {
                    specs: {
                        path: ['seed_batch'],
                        equals: 'catalog-bulk-v1',
                    },
                },
            });
            console.log(
                `Reset incomplete bulk catalog (${existingBulkVariants}/${expectedBulkVariants} variants); deleted ${deleted.count} product(s)`,
            );
        }

        const productBatchSize = 100;
        const createdProducts: { id: string; name: string; category_id: string }[] =
            [];

        for (let i = 0; i < bulkDefs.length; i += productBatchSize) {
            const batch = bulkDefs.slice(i, i + productBatchSize);
            const created = await prisma.product.createManyAndReturn({
                data: batch.map((product) => ({
                    name: product.name,
                    description: product.description,
                    specs: product.specs,
                    status: product.status,
                    category_id: product.category_id,
                })),
            });
            createdProducts.push(...created);
            console.log(
                `Bulk products: ${Math.min(i + productBatchSize, bulkDefs.length)}/${bulkDefs.length}`,
            );
        }

        const productIdByKey = new Map(
            createdProducts.map((product) => [
                `${product.category_id}:${product.name}`,
                product.id,
            ]),
        );

        const productImages = bulkDefs.flatMap((product) => {
            const productId = productIdByKey.get(
                `${product.category_id}:${product.name}`,
            );
            if (!productId) {
                return [];
            }
            return product.images.map((image) => ({
                product_id: productId,
                image_url: image.image_url,
                sort_order: image.sort_order,
            }));
        });
        for (let i = 0; i < productImages.length; i += 500) {
            await prisma.productImage.createMany({
                data: productImages.slice(i, i + 500),
            });
        }

        const variantRows = bulkDefs.flatMap((product) => {
            const productId = productIdByKey.get(
                `${product.category_id}:${product.name}`,
            );
            if (!productId) {
                return [];
            }
            return product.variants.map((variant) => ({
                variant_code: variant.variant_code,
                color: variant.color,
                size: variant.size,
                variant_info: variant.variant_info,
                status:
                    variant.markets.length > 0
                        ? VariantStatus.ACTIVE
                        : VariantStatus.PENDING_REVIEW,
                product_id: productId,
                image_url: variant.image_url,
                markets: variant.markets,
            }));
        });

        const createdVariants: { id: string; variant_code: string }[] = [];
        for (let i = 0; i < variantRows.length; i += 200) {
            const batch = variantRows.slice(i, i + 200);
            const created = await prisma.variant.createManyAndReturn({
                data: batch.map((variant) => ({
                    variant_code: variant.variant_code,
                    color: variant.color,
                    size: variant.size,
                    variant_info: variant.variant_info,
                    status: variant.status,
                    product_id: variant.product_id,
                })),
            });
            createdVariants.push(...created);
            console.log(
                `Bulk variants: ${Math.min(i + 200, variantRows.length)}/${variantRows.length}`,
            );
        }

        const variantIdByCode = new Map(
            createdVariants.map((variant) => [variant.variant_code, variant.id]),
        );

        const variantImages = variantRows
            .map((variant) => {
                const variantId = variantIdByCode.get(variant.variant_code);
                if (!variantId) {
                    return null;
                }
                return {
                    variant_id: variantId,
                    image_url: variant.image_url,
                };
            })
            .filter(
                (row): row is { variant_id: string; image_url: string } =>
                    row !== null,
            );
        for (let i = 0; i < variantImages.length; i += 500) {
            await prisma.variantImage.createMany({
                data: variantImages.slice(i, i + 500),
            });
        }

        const marketVariantRows = variantRows.flatMap((variant) => {
            const variantId = variantIdByCode.get(variant.variant_code);
            if (!variantId) {
                return [];
            }
            return variant.markets
                .map((marketPrice) => {
                    const market = marketByCode.get(marketPrice.market_code);
                    if (!market) {
                        return null;
                    }
                    return {
                        market_id: market.id,
                        variant_id: variantId,
                        price: marketPrice.price,
                        currency: marketPrice.currency,
                        sold_out: false,
                        status: 'ACTIVE' as const,
                        variant_code: variant.variant_code,
                        market_code: marketPrice.market_code,
                    };
                })
                .filter(
                    (
                        row,
                    ): row is {
                        market_id: string;
                        variant_id: string;
                        price: number;
                        currency: string;
                        sold_out: boolean;
                        status: 'ACTIVE';
                        variant_code: string;
                        market_code: string;
                    } => row !== null,
                );
        });

        for (let i = 0; i < marketVariantRows.length; i += 200) {
            const batch = marketVariantRows.slice(i, i + 200);
            const created = await prisma.marketVariant.createManyAndReturn({
                data: batch.map((row) => ({
                    market_id: row.market_id,
                    variant_id: row.variant_id,
                    price: row.price,
                    currency: row.currency,
                    sold_out: row.sold_out,
                    status: row.status,
                })),
            });
            for (const [index, marketVariant] of created.entries()) {
                seededMarketVariants.push({
                    id: marketVariant.id,
                    variant_code: batch[index].variant_code,
                    market_code: batch[index].market_code,
                });
            }
            console.log(
                `Bulk market variants: ${Math.min(i + 200, marketVariantRows.length)}/${marketVariantRows.length}`,
            );
        }

        bulkProductCount = createdProducts.length;
    }

    console.log(
        `Seeded catalog: ${DEFAULT_CATEGORIES.length} categories, ${productsDef.length} demo products, ${bulkProductCount} bulk products, ${seededMarketVariants.length} market variants`,
    );

    return seededMarketVariants;
}

async function seedWarehousesAndInventory(
    markets: { id: string; code: string }[],
    managers: { id: string; email: string }[],
    marketVariants: { id: string; variant_code: string; market_code: string }[],
) {
    const ngMarket = markets.find((market) => market.code === 'NG');
    const ghMarket = markets.find((market) => market.code === 'GH');
    const ngManager =
        managers.find((staff) => staff.email === 'warehouse.ng@dukka.local') ??
        managers[0];
    const ghManager =
        managers.find((staff) => staff.email === 'support.gh@dukka.local') ??
        managers[0];

    if (!ngMarket || !ghMarket || !ngManager || !ghManager) {
        throw new Error('Missing market or manager for warehouse seed');
    }

    const serviceStatesDef = [
        { market_code: 'NG', state_name: 'Lagos' },
        { market_code: 'NG', state_name: 'Abuja' },
        { market_code: 'GH', state_name: 'Greater Accra' },
        { market_code: 'GH', state_name: 'Ashanti' },
    ] as const;

    const serviceStates: {
        id: string;
        market_code: string;
        state_name: string;
    }[] = [];

    for (const stateDef of serviceStatesDef) {
        const market = markets.find((row) => row.code === stateDef.market_code);
        if (!market) {
            continue;
        }

        const serviceState = await prisma.serviceState.upsert({
            where: {
                market_id_state_name: {
                    market_id: market.id,
                    state_name: stateDef.state_name,
                },
            },
            create: {
                market_id: market.id,
                state_name: stateDef.state_name,
                status: 'OPEN',
            },
            update: {
                status: 'OPEN',
            },
        });

        serviceStates.push({
            id: serviceState.id,
            market_code: market.code,
            state_name: stateDef.state_name,
        });
    }

    const warehousesDef = [
        {
            name: 'Lagos Central Warehouse',
            market_id: ngMarket.id,
            market_code: 'NG',
            manager_id: ngManager.id,
            address: 'Plot 8, Kudirat Abiola Way, Oregun, Lagos',
            status: WarehouseStatus.OPEN,
            service_state_names: ['Lagos', 'Abuja'],
        },
        {
            name: 'Accra Fulfillment Hub',
            market_id: ghMarket.id,
            market_code: 'GH',
            manager_id: ghManager.id,
            address: 'Spintex Road, Accra',
            status: WarehouseStatus.OPEN,
            service_state_names: ['Greater Accra', 'Ashanti'],
        },
    ] as const;

    const warehouses: { id: string; name: string; market_id: string }[] = [];

    for (const warehouseDef of warehousesDef) {
        let warehouse = await prisma.warehouse.findFirst({
            where: {
                name: warehouseDef.name,
                market_id: warehouseDef.market_id,
            },
        });

        if (!warehouse) {
            warehouse = await prisma.warehouse.create({
                data: {
                    name: warehouseDef.name,
                    market_id: warehouseDef.market_id,
                    manager_id: warehouseDef.manager_id,
                    address: warehouseDef.address,
                    status: warehouseDef.status,
                },
            });
        } else {
            warehouse = await prisma.warehouse.update({
                where: { id: warehouse.id },
                data: {
                    manager_id: warehouseDef.manager_id,
                    address: warehouseDef.address,
                    status: warehouseDef.status,
                },
            });
        }

        for (const stateName of warehouseDef.service_state_names) {
            const serviceState = serviceStates.find(
                (row) =>
                    row.state_name === stateName &&
                    row.market_code === warehouseDef.market_code,
            );
            if (!serviceState) {
                continue;
            }

            await prisma.warehouseServiceState.upsert({
                where: {
                    warehouse_id_service_state_id: {
                        warehouse_id: warehouse.id,
                        service_state_id: serviceState.id,
                    },
                },
                create: {
                    warehouse_id: warehouse.id,
                    service_state_id: serviceState.id,
                },
                update: {},
            });
        }

        warehouses.push(warehouse);
    }

    const inventoryPlan = [
        {
            warehouse_name: 'Lagos Central Warehouse',
            variant_code: 'PULSE-BLK-STD',
            market_code: 'NG',
            available_quantity: 120,
        },
        {
            warehouse_name: 'Lagos Central Warehouse',
            variant_code: 'PULSE-WHT-STD',
            market_code: 'NG',
            available_quantity: 75,
        },
        {
            warehouse_name: 'Lagos Central Warehouse',
            variant_code: 'ANK-TEE-M',
            market_code: 'NG',
            available_quantity: 200,
        },
        {
            warehouse_name: 'Lagos Central Warehouse',
            variant_code: 'ANK-TEE-L',
            market_code: 'NG',
            available_quantity: 180,
        },
        {
            warehouse_name: 'Accra Fulfillment Hub',
            variant_code: 'PULSE-BLK-STD',
            market_code: 'GH',
            available_quantity: 40,
        },
        {
            warehouse_name: 'Accra Fulfillment Hub',
            variant_code: 'CHARGE-HUB-GRY',
            market_code: 'GH',
            available_quantity: 60,
        },
    ] as const;

    for (const plan of inventoryPlan) {
        const warehouse = warehouses.find((row) => row.name === plan.warehouse_name);
        const marketVariant = marketVariants.find(
            (row) =>
                row.variant_code === plan.variant_code &&
                row.market_code === plan.market_code,
        );
        if (!warehouse || !marketVariant) {
            continue;
        }

        await prisma.inventory.upsert({
            where: {
                market_variant_id_warehouse_id: {
                    market_variant_id: marketVariant.id,
                    warehouse_id: warehouse.id,
                },
            },
            create: {
                market_variant_id: marketVariant.id,
                warehouse_id: warehouse.id,
                available_quantity: plan.available_quantity,
            },
            update: {
                available_quantity: plan.available_quantity,
            },
        });
    }

    const plannedIds = new Set(
        inventoryPlan
            .map((plan) => {
                const marketVariant = marketVariants.find(
                    (row) =>
                        row.variant_code === plan.variant_code &&
                        row.market_code === plan.market_code,
                );
                return marketVariant?.id;
            })
            .filter((id): id is string => id !== undefined),
    );

    const lagos = warehouses.find((row) => row.name === 'Lagos Central Warehouse');
    const accra = warehouses.find((row) => row.name === 'Accra Fulfillment Hub');
    const bulkInventoryRows: {
        market_variant_id: string;
        warehouse_id: string;
        available_quantity: number;
    }[] = [];

    for (const [index, marketVariant] of marketVariants.entries()) {
        if (plannedIds.has(marketVariant.id)) {
            continue;
        }
        const warehouse =
            marketVariant.market_code === 'NG'
                ? lagos
                : marketVariant.market_code === 'GH'
                  ? accra
                  : undefined;
        if (!warehouse) {
            continue;
        }
        bulkInventoryRows.push({
            market_variant_id: marketVariant.id,
            warehouse_id: warehouse.id,
            available_quantity: 25 + (index % 175),
        });
    }

    if (bulkInventoryRows.length > 0) {
        const chunkSize = 200;
        for (let i = 0; i < bulkInventoryRows.length; i += chunkSize) {
            await prisma.inventory.createMany({
                data: bulkInventoryRows.slice(i, i + chunkSize),
                skipDuplicates: true,
            });
        }
    }

    console.log(
        `Seeded ${warehouses.length} warehouse(s), ${serviceStates.length} service state(s), and inventory rows (${inventoryPlan.length} demo + ${bulkInventoryRows.length} bulk)`,
    );

    return warehouses;
}

async function seedPromotions(
    markets: { id: string; code: string }[],
    marketVariants: { id: string; variant_code: string; market_code: string }[],
) {
    const ngMarket = markets.find((market) => market.code === 'NG');
    if (!ngMarket) {
        throw new Error('NG market is required to seed promotions');
    }

    const product = await prisma.product.findUnique({
        where: { id: PROMO_TARGET_PRODUCT_ID },
        select: { id: true, name: true },
    });
    if (!product) {
        throw new Error(
            `Promotion target product ${PROMO_TARGET_PRODUCT_ID} was not seeded`,
        );
    }

    const pulseBlack = marketVariants.find(
        (row) =>
            row.variant_code === 'PULSE-BLK-STD' && row.market_code === 'NG',
    );
    const pulseWhite = marketVariants.find(
        (row) =>
            row.variant_code === 'PULSE-WHT-STD' && row.market_code === 'NG',
    );
    if (!pulseBlack || !pulseWhite) {
        throw new Error(
            'PULSE NG market variants are required to seed promotions',
        );
    }

    const now = new Date();
    const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const promotionsDef = [
        {
            code: 'PULSE15',
            name: 'Pulse White 15% Off',
            description: '15% off Dukka Pulse White Standard.',
            discount: {
                type: DiscountType.PERCENTAGE,
                value: 15,
                max_discount_amount: 15000,
            },
            market: {
                variant_ids: [pulseWhite.id],
            },
        },
        {
            code: 'PULSEBLK2K',
            name: 'Pulse Black ₦2000 Off',
            description: 'Flat ₦2000 off Pulse Black Standard.',
            discount: {
                type: DiscountType.FIXED,
                value: 2000,
                max_discount_amount: 2000,
            },
            market: {
                variant_ids: [pulseBlack.id],
            },
        },
    ] as const;

    let seededCount = 0;

    for (const promoDef of promotionsDef) {
        let promotion = await prisma.promotion.findUnique({
            where: { code: promoDef.code },
            select: { id: true, discount_id: true },
        });

        if (!promotion) {
            const discount = await prisma.discount.create({
                data: {
                    type: promoDef.discount.type,
                    value: promoDef.discount.value,
                    max_discount_amount: promoDef.discount.max_discount_amount,
                },
            });
            promotion = await prisma.promotion.create({
                data: {
                    name: promoDef.name,
                    description: promoDef.description,
                    code: promoDef.code,
                    status: PromotionStatus.ACTIVE,
                    discount_id: discount.id,
                },
                select: { id: true, discount_id: true },
            });
        } else {
            await prisma.discount.update({
                where: { id: promotion.discount_id },
                data: {
                    type: promoDef.discount.type,
                    value: promoDef.discount.value,
                    max_discount_amount: promoDef.discount.max_discount_amount,
                },
            });
            await prisma.promotion.update({
                where: { id: promotion.id },
                data: {
                    name: promoDef.name,
                    description: promoDef.description,
                    status: PromotionStatus.ACTIVE,
                },
            });
        }

        const promotionMarket = await prisma.promotionMarket.upsert({
            where: {
                promotion_id_market_id: {
                    promotion_id: promotion.id,
                    market_id: ngMarket.id,
                },
            },
            create: {
                promotion_id: promotion.id,
                market_id: ngMarket.id,
                status: PromotionMarketStatus.ACTIVE,
                start_date: startDate,
                end_date: endDate,
            },
            update: {
                status: PromotionMarketStatus.ACTIVE,
                start_date: startDate,
                end_date: endDate,
            },
        });

        for (const variant_id of promoDef.market.variant_ids) {
            await prisma.promotionMarketVariant.upsert({
                where: {
                    promotion_market_id_variant_id: {
                        promotion_market_id: promotionMarket.id,
                        variant_id,
                    },
                },
                create: {
                    promotion_market_id: promotionMarket.id,
                    variant_id,
                },
                update: {},
            });
        }

        seededCount += 1;
    }

    console.log(
        `Seeded promotions: ${seededCount} active NG promotions targeting ${product.name} (${product.id})`,
    );
}

async function seedOrdersReviewsAndFulfillment(
    customers: { id: string; email: string }[],
    markets: { id: string; code: string }[],
    warehouses: { id: string; name: string }[],
    marketVariants: { id: string; variant_code: string; market_code: string }[],
) {
    const adaeze = customers.find(
        (customer) => customer.email === 'adaeze.customer@dukka.local',
    );
    const kofi = customers.find(
        (customer) => customer.email === 'kofi.customer@dukka.local',
    );
    const ngMarket = markets.find((market) => market.code === 'NG');
    const ghMarket = markets.find((market) => market.code === 'GH');
    const lagosWarehouse = warehouses.find(
        (warehouse) => warehouse.name === 'Lagos Central Warehouse',
    );
    const accraWarehouse = warehouses.find(
        (warehouse) => warehouse.name === 'Accra Fulfillment Hub',
    );
    const ngPulse = marketVariants.find(
        (row) => row.variant_code === 'PULSE-BLK-STD' && row.market_code === 'NG',
    );
    const ngTee = marketVariants.find(
        (row) => row.variant_code === 'ANK-TEE-M' && row.market_code === 'NG',
    );
    const ghPulse = marketVariants.find(
        (row) => row.variant_code === 'PULSE-BLK-STD' && row.market_code === 'GH',
    );

    if (
        !adaeze ||
        !kofi ||
        !ngMarket ||
        !ghMarket ||
        !lagosWarehouse ||
        !accraWarehouse ||
        !ngPulse ||
        !ngTee ||
        !ghPulse
    ) {
        throw new Error('Missing dependencies for order/review seed');
    }

    const adaezeAddress = {
        first_name: 'Adaeze',
        last_name: 'Nnamdi',
        email: 'ship.adaeze@dukka.local',
        phone_number: '+2348033333333',
        whatsapp_number: '+2348033333333',
        country: 'Nigeria',
        state: 'Lagos',
        market_id: ngMarket.id,
        street_address: '12 Admiralty Way, Lekki',
    };
    const kofiAddress = {
        first_name: 'Kofi',
        last_name: 'Asante',
        email: 'ship.kofi@dukka.local',
        phone_number: '+233202222222',
        whatsapp_number: '+233202222222',
        country: 'Ghana',
        state: 'Greater Accra',
        market_id: ghMarket.id,
        street_address: '45 Independence Ave, Accra',
    };

    const existingAdaezeOrders = await prisma.order.count({
        where: { customer_id: adaeze.id },
    });

    if (existingAdaezeOrders === 0) {
        const pulseQty = 1;
        const teeQty = 2;
        const pulsePrice = 85000;
        const teePrice = 15000;
        const subtotal = pulsePrice * pulseQty + teePrice * teeQty;
        const shippingFee = 2500;

        await prisma.order.create({
            data: {
                order_number: 'DK-SEED-NG-001',
                idempotency_key: 'seed-order-ng-001',
                customer_id: adaeze.id,
                market_id: ngMarket.id,
                warehouse_id: lagosWarehouse.id,
                currency: 'NGN',
                subtotal,
                shipping_fee: shippingFee,
                discount_amount: 0,
                points_discount: 0,
                coupon_discount: 0,
                total_amount: subtotal + shippingFee,
                shipping_address: adaezeAddress,
                billing_address: adaezeAddress,
                order_items: {
                    create: [
                        {
                            market_variant_id: ngPulse.id,
                            quantity: pulseQty,
                            price: pulsePrice,
                            total: pulsePrice * pulseQty,
                            product_name: 'Dukka Pulse Headphones',
                            product_image:
                                'https://cdn.dukka.local/variants/pulse-blk.jpg',
                            product_specs: {
                                color: 'Black',
                                size: 'Standard',
                            },
                        },
                        {
                            market_variant_id: ngTee.id,
                            quantity: teeQty,
                            price: teePrice,
                            total: teePrice * teeQty,
                            product_name: 'Ankara Everyday Tee',
                            product_image:
                                'https://cdn.dukka.local/variants/ank-tee-m.jpg',
                            product_specs: {
                                color: 'Multicolor',
                                size: 'M',
                            },
                        },
                    ],
                },
                order_inventory: {
                    create: {
                        warehouse_id: lagosWarehouse.id,
                        status: OrderInventoryStatus.SUCCESS,
                        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
                        line_items: {
                            create: [
                                {
                                    market_variant_id: ngPulse.id,
                                    quantity: pulseQty,
                                },
                                {
                                    market_variant_id: ngTee.id,
                                    quantity: teeQty,
                                },
                            ],
                        },
                    },
                },
            },
        });

        const pendingTeeQty = 1;
        const pendingSubtotal = teePrice * pendingTeeQty;
        const pendingShippingFee = 1500;

        await prisma.order.create({
            data: {
                order_number: 'DK-SEED-NG-002',
                idempotency_key: 'seed-order-ng-002',
                customer_id: adaeze.id,
                market_id: ngMarket.id,
                warehouse_id: lagosWarehouse.id,
                currency: 'NGN',
                subtotal: pendingSubtotal,
                shipping_fee: pendingShippingFee,
                discount_amount: 0,
                points_discount: 0,
                coupon_discount: 0,
                total_amount: pendingSubtotal + pendingShippingFee,
                shipping_address: adaezeAddress,
                billing_address: adaezeAddress,
                order_items: {
                    create: [
                        {
                            market_variant_id: ngTee.id,
                            quantity: pendingTeeQty,
                            price: teePrice,
                            total: teePrice * pendingTeeQty,
                            product_name: 'Ankara Everyday Tee',
                            product_image:
                                'https://cdn.dukka.local/variants/ank-tee-m.jpg',
                            product_specs: {
                                color: 'Multicolor',
                                size: 'M',
                            },
                        },
                    ],
                },
                order_inventory: {
                    create: {
                        warehouse_id: lagosWarehouse.id,
                        status: OrderInventoryStatus.PENDING,
                        expires_at: new Date(Date.now() + 30 * 60 * 1000),
                        line_items: {
                            create: [
                                {
                                    market_variant_id: ngTee.id,
                                    quantity: pendingTeeQty,
                                },
                            ],
                        },
                    },
                },
            },
        });
    }

    const existingKofiOrders = await prisma.order.count({
        where: { customer_id: kofi.id },
    });

    if (existingKofiOrders === 0) {
        const ghPulseQty = 1;
        const ghPulsePrice = 950;
        const ghSubtotal = ghPulsePrice * ghPulseQty;
        const ghShippingFee = 40;

        await prisma.order.create({
            data: {
                order_number: 'DK-SEED-GH-001',
                idempotency_key: 'seed-order-gh-001',
                customer_id: kofi.id,
                market_id: ghMarket.id,
                warehouse_id: accraWarehouse.id,
                currency: 'GHS',
                subtotal: ghSubtotal,
                shipping_fee: ghShippingFee,
                discount_amount: 0,
                points_discount: 0,
                coupon_discount: 0,
                total_amount: ghSubtotal + ghShippingFee,
                shipping_address: kofiAddress,
                billing_address: kofiAddress,
                order_items: {
                    create: [
                        {
                            market_variant_id: ghPulse.id,
                            quantity: ghPulseQty,
                            price: ghPulsePrice,
                            total: ghPulsePrice * ghPulseQty,
                            product_name: 'Dukka Pulse Headphones',
                            product_image:
                                'https://cdn.dukka.local/variants/pulse-blk.jpg',
                            product_specs: {
                                color: 'Black',
                                size: 'Standard',
                            },
                        },
                    ],
                },
                order_inventory: {
                    create: {
                        warehouse_id: accraWarehouse.id,
                        status: OrderInventoryStatus.EXPIRED,
                        expires_at: new Date(Date.now() - 60 * 60 * 1000),
                        line_items: {
                            create: [
                                {
                                    market_variant_id: ghPulse.id,
                                    quantity: ghPulseQty,
                                },
                            ],
                        },
                    },
                },
            },
        });
    }

    const existingAdaezeReview = await prisma.reviews.findFirst({
        where: {
            customer_id: adaeze.id,
            market_variant_id: ngPulse.id,
        },
    });

    if (!existingAdaezeReview) {
        await prisma.reviews.create({
            data: {
                customer_id: adaeze.id,
                customer_name: adaeze.name,
                market_variant_id: ngPulse.id,
                title: 'Excellent sound',
                review: 'Comfortable fit and clear audio for long calls.',
                rating: 5,
                likes: 4,
                dislikes: 0,
                review_images: {
                    create: [
                        {
                            image_url:
                                'https://cdn.dukka.local/reviews/pulse-review-1.jpg',
                        },
                    ],
                },
            },
        });
    }

    const existingKofiReview = await prisma.reviews.findFirst({
        where: {
            customer_id: kofi.id,
            market_variant_id: ghPulse.id,
        },
    });

    if (!existingKofiReview) {
        await prisma.reviews.create({
            data: {
                customer_id: kofi.id,
                customer_name: kofi.name,
                market_variant_id: ghPulse.id,
                title: 'Great value',
                review: 'Battery lasts through a full workday.',
                rating: 4,
                likes: 2,
                dislikes: 0,
            },
        });
    }

    console.log('Seeded orders, inventory line items, and reviews');
}

async function main() {
    await seedPermissions();
    await seedCurrencies();
    await seedMarkets();

    const markets = await prisma.market.findMany({
        select: { id: true, code: true },
    });

    const superAdminRole = await seedSuperAdminRole();
    const additionalRoles = await seedAdditionalRoles();
    const superAdmin = await seedSuperAdminStaff(superAdminRole.id);
    const demoStaff = await seedDemoStaff(
        additionalRoles,
        markets,
        superAdmin.id,
    );
    const customers = await seedCustomers();
    const marketVariants = await seedCatalog(markets);
    await seedPromotions(markets, marketVariants);
    const warehouses = await seedWarehousesAndInventory(
        markets,
        demoStaff,
        marketVariants,
    );
    await seedShippingAddresses(customers, markets);
    await seedBillingAddresses(customers, markets);
    await seedOrdersReviewsAndFulfillment(
        customers,
        markets,
        warehouses,
        marketVariants,
    );

    console.log('Seed completed successfully');
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
