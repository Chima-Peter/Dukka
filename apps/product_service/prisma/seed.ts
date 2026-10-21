import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
    PrismaClient,
    ProductStatus,
    WarehouseStatus,
} from '../generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is required to run the seed');
}

const schema =
    new URL(connectionString).searchParams.get('schema') ?? 'public';

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }, { schema }),
});

const ACCOUNTS_SCHEMA = 'accounts';

const CATEGORIES = [
    { id: '11111111-1111-4111-8111-111111111101', name: 'Apparel' },
    { id: '11111111-1111-4111-8111-111111111102', name: 'Footwear' },
    { id: '11111111-1111-4111-8111-111111111103', name: 'Accessories' },
] as const;

type AccountMarket = {
    id: string;
    code: string;
    currency_code: string;
};

type AccountStaff = {
    id: string;
    email: string;
};

async function loadAccountMarkets(): Promise<AccountMarket[]> {
    return await prisma.$queryRawUnsafe<AccountMarket[]>(
        `
        SELECT m.id, m.code, c.code AS currency_code
        FROM "${ACCOUNTS_SCHEMA}"."Market" m
        INNER JOIN "${ACCOUNTS_SCHEMA}"."Currency" c ON c.id = m.currency_id
        WHERE m.is_active = true
        ORDER BY m.code ASC
        `,
    );
}

async function loadAccountManager(): Promise<AccountStaff> {
    const email =
        process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@dukka.local';

    const byEmail = await prisma.$queryRawUnsafe<AccountStaff[]>(
        `
        SELECT id, email
        FROM "${ACCOUNTS_SCHEMA}"."Staff"
        WHERE email = $1 AND is_active = true
        LIMIT 1
        `,
        email,
    );
    if (byEmail[0]) {
        return byEmail[0];
    }

    const anyStaff = await prisma.$queryRawUnsafe<AccountStaff[]>(
        `
        SELECT id, email
        FROM "${ACCOUNTS_SCHEMA}"."Staff"
        WHERE is_active = true
        ORDER BY created_at ASC
        LIMIT 1
        `,
    );
    if (!anyStaff[0]) {
        throw new Error(
            'No active staff found in accounts schema. Seed account_service first.',
        );
    }
    return anyStaff[0];
}

async function seedCategories() {
    for (const category of CATEGORIES) {
        await prisma.category.upsert({
            where: { name: category.name },
            create: {
                id: category.id,
                name: category.name,
            },
            update: {
                name: category.name,
            },
        });
    }
    console.log(`Seeded ${CATEGORIES.length} categories`);
}

async function seedWarehouses(
    markets: AccountMarket[],
    manager: AccountStaff,
) {
    for (const market of markets) {
        const name = `${market.code} Central Warehouse`;
        const existing = await prisma.warehouse.findFirst({
            where: { market_id: market.id, name },
        });
        if (existing) {
            await prisma.warehouse.update({
                where: { id: existing.id },
                data: {
                    manager_id: manager.id,
                    address: `1 Commerce Way, ${market.code}`,
                    status: WarehouseStatus.OPEN,
                },
            });
            continue;
        }
        await prisma.warehouse.create({
            data: {
                market_id: market.id,
                name,
                manager_id: manager.id,
                address: `1 Commerce Way, ${market.code}`,
                status: WarehouseStatus.OPEN,
            },
        });
    }
    console.log(
        `Seeded warehouses for ${markets.length} market(s) (manager ${manager.email})`,
    );
}

async function seedProducts(markets: AccountMarket[]) {
    const apparel = await prisma.category.findUniqueOrThrow({
        where: { name: 'Apparel' },
    });
    const footwear = await prisma.category.findUniqueOrThrow({
        where: { name: 'Footwear' },
    });

    const products = [
        {
            id: '22222222-2222-4222-8222-222222222201',
            name: 'Dukka Classic Tee',
            description: 'Soft cotton tee for everyday wear.',
            specs: { material: '100% cotton', fit: 'regular' },
            status: ProductStatus.ACTIVE,
            category_id: apparel.id,
            images: [
                {
                    image_url:
                        'https://placehold.co/800x800/png?text=Classic+Tee',
                    sort_order: 0,
                },
            ],
            variants: [
                {
                    id: '33333333-3333-4333-8333-333333333301',
                    variant_code: 'SEED-TEE-BLK-M',
                    color: 'Black',
                    size: 'M',
                    variant_info: { sku_label: 'Tee Black M' },
                    image_url:
                        'https://placehold.co/600x600/png?text=Tee+Black',
                    prices: { NG: '8999.00', GH: '149.00' },
                    inventory: 120,
                },
                {
                    id: '33333333-3333-4333-8333-333333333302',
                    variant_code: 'SEED-TEE-WHT-L',
                    color: 'White',
                    size: 'L',
                    variant_info: { sku_label: 'Tee White L' },
                    image_url:
                        'https://placehold.co/600x600/png?text=Tee+White',
                    prices: { NG: '8999.00', GH: '149.00' },
                    inventory: 80,
                },
            ],
        },
        {
            id: '22222222-2222-4222-8222-222222222202',
            name: 'Dukka Runner',
            description: 'Lightweight everyday running shoe.',
            specs: { material: 'mesh', cushioning: 'mid' },
            status: ProductStatus.ACTIVE,
            category_id: footwear.id,
            images: [
                {
                    image_url:
                        'https://placehold.co/800x800/png?text=Runner',
                    sort_order: 0,
                },
            ],
            variants: [
                {
                    id: '33333333-3333-4333-8333-333333333303',
                    variant_code: 'SEED-RUN-NVY-42',
                    color: 'Navy',
                    size: '42',
                    variant_info: { sku_label: 'Runner Navy 42' },
                    image_url:
                        'https://placehold.co/600x600/png?text=Runner+Navy',
                    prices: { NG: '45999.00', GH: '699.00' },
                    inventory: 40,
                },
            ],
        },
        {
            id: '22222222-2222-4222-8222-222222222203',
            name: 'Dukka Pending Hoodie',
            description: 'Product awaiting approval.',
            specs: { material: 'fleece' },
            status: ProductStatus.PENDING_REVIEW,
            category_id: apparel.id,
            images: [
                {
                    image_url:
                        'https://placehold.co/800x800/png?text=Hoodie',
                    sort_order: 0,
                },
            ],
            variants: [
                {
                    id: '33333333-3333-4333-8333-333333333304',
                    variant_code: 'SEED-HOOD-GRY-M',
                    color: 'Grey',
                    size: 'M',
                    variant_info: { sku_label: 'Hoodie Grey M' },
                    prices: {} as Record<string, string>,
                    inventory: 0,
                },
            ],
        },
    ] as const;

    const marketByCode = new Map(markets.map((market) => [market.code, market]));
    const warehouses = await prisma.warehouse.findMany();
    const warehouseByMarketId = new Map(
        warehouses.map((warehouse) => [warehouse.market_id, warehouse]),
    );

    for (const product of products) {
        await prisma.product.upsert({
            where: { id: product.id },
            create: {
                id: product.id,
                name: product.name,
                description: product.description,
                specs: product.specs,
                status: product.status,
                category_id: product.category_id,
                images: {
                    create: product.images.map((image) => ({
                        image_url: image.image_url,
                        sort_order: image.sort_order,
                    })),
                },
                variants: {
                    create: product.variants.map((variant) => ({
                        id: variant.id,
                        variant_code: variant.variant_code,
                        color: variant.color,
                        size: variant.size,
                        variant_info: variant.variant_info,
                        ...('image_url' in variant &&
                            variant.image_url !== undefined && {
                                image: {
                                    create: { image_url: variant.image_url },
                                },
                            }),
                    })),
                },
            },
            update: {
                name: product.name,
                description: product.description,
                specs: product.specs,
                status: product.status,
                category_id: product.category_id,
            },
        });

        for (const variant of product.variants) {
            for (const [marketCode, price] of Object.entries(variant.prices)) {
                const market = marketByCode.get(marketCode);
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
                        price,
                        currency: market.currency_code,
                    },
                    update: {
                        price,
                        currency: market.currency_code,
                    },
                });

                if (variant.inventory > 0) {
                    const warehouse = warehouseByMarketId.get(market.id);
                    if (!warehouse) {
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
                            available_quantity: variant.inventory,
                            reserved_quantity: 0,
                        },
                        update: {
                            available_quantity: variant.inventory,
                            reserved_quantity: 0,
                        },
                    });
                }
            }
        }
    }

    console.log(
        `Seeded ${products.length} products with market variants and inventory`,
    );
}

async function main() {
    const markets = await loadAccountMarkets();
    if (markets.length === 0) {
        throw new Error(
            'No active markets found in accounts schema. Seed account_service first.',
        );
    }
    console.log(
        `Loaded ${markets.length} market(s) from accounts: ${markets
            .map((market) => market.code)
            .join(', ')}`,
    );

    const manager = await loadAccountManager();
    await seedCategories();
    await seedWarehouses(markets, manager);
    await seedProducts(markets);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
