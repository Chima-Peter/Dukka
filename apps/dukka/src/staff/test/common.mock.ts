const staffPermissionProxy = new Proxy(
    {},
    {
        get: (_target, property) => String(property),
    },
);

/**
 * Partial mock for @app/common that keeps real exports (PrismaService, enums,
 * etc.) and only stubs Nest decorators / tokens used in controller wiring.
 */
export async function createCommonMock(
    importOriginal: <T>() => Promise<T>,
) {
    const actual = await importOriginal<
        typeof import('../../../../../libs/common/src/index.ts')
    >();

    return {
        ...actual,
        Auth: () => () => undefined,
        CurrentCustomer: () => () => undefined,
        CurrentStaff: () => () => undefined,
        OptionalCustomerAuth: () => () => undefined,
        Public: () => () => undefined,
        RequirePermission: () => () => undefined,
        ResponseMessage: () => () => undefined,
        StaffPermission: staffPermissionProxy,
        AVATAR_BUCKET: 'avatar',
        QUALIFICATIONS_BUCKET: 'qualifications',
        MAX_AVATAR_BYTES: 5 * 1024 * 1024,
        MAX_QUALIFICATION_BYTES: 10 * 1024 * 1024,
        ALLOWED_AVATAR_CONTENT_TYPES: new Set([
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
        ]),
        ALLOWED_QUALIFICATION_CONTENT_TYPES: new Set(['application/pdf']),
    };
}
