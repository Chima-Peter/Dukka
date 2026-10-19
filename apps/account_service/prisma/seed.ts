import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { STAFF_ACCOUNT_PERMISSIONS } from '../../../libs/common/src/permissions/staff-permissions.js';

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

const DEFAULT_MARKETS = [
    { name: 'Nigeria', code: 'NG' },
    { name: 'Ghana', code: 'GH' },
    { name: 'Kenya', code: 'KE' },
] as const;

async function seedPermissions() {
    const permissionNames = STAFF_ACCOUNT_PERMISSIONS.map(
        (permission) => permission.name,
    );

    for (const permission of STAFF_ACCOUNT_PERMISSIONS) {
        await prisma.permission.upsert({
            where: { name: permission.name },
            create: {
                name: permission.name,
                description: permission.description,
            },
            update: {
                description: permission.description,
            },
        });
    }

    const obsolete = await prisma.permission.findMany({
        where: { name: { notIn: [...permissionNames] } },
        select: { id: true, name: true },
    });
    if (obsolete.length > 0) {
        await prisma.rolePermission.deleteMany({
            where: { permission_id: { in: obsolete.map((row) => row.id) } },
        });
        await prisma.permission.deleteMany({
            where: { id: { in: obsolete.map((row) => row.id) } },
        });
        console.log(
            `Removed ${obsolete.length} obsolete permission(s): ${obsolete
                .map((row) => row.name)
                .join(', ')}`,
        );
    }

    console.log(
        `Seeded ${STAFF_ACCOUNT_PERMISSIONS.length} staff account permissions`,
    );
}

async function seedMarkets() {
    for (const market of DEFAULT_MARKETS) {
        await prisma.market.upsert({
            where: { code: market.code },
            create: {
                name: market.name,
                code: market.code,
                is_active: true,
            },
            update: {
                name: market.name,
                is_active: true,
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
        },
        update: {
            description: 'Full access across all markets and permissions',
            hierarchy: SUPER_ADMIN_HIERARCHY,
        },
    });

    const permissions = await prisma.permission.findMany({
        select: { id: true },
    });
    await prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({
            role_id: role.id,
            permission_id: permission.id,
        })),
        skipDuplicates: true,
    });

    const markets = await prisma.market.findMany({
        select: { id: true },
    });
    await prisma.roleMarket.createMany({
        data: markets.map((market) => ({
            role_id: role.id,
            market_id: market.id,
        })),
        skipDuplicates: true,
    });

    console.log(
        `Seeded ${SUPER_ADMIN_ROLE_NAME} with ${permissions.length} permission(s) and ${markets.length} market(s)`,
    );

    return role;
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
            role_id,
            is_active: true,
        },
        update: {
            name,
            password: hashedPassword,
            role_id,
            is_active: true,
        },
    });

    console.log(`Seeded super admin staff ${staff.email}`);
}

async function main() {
    await seedPermissions();
    await seedMarkets();
    const role = await seedSuperAdminRole();
    await seedSuperAdminStaff(role.id);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
