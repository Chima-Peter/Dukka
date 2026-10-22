import type { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

/** Text from P2003/P2025 meta for scalar FK and nested `connect` failures. */
export function prismaRelationHint(
    error: PrismaClientKnownRequestError,
): string {
    const field = String(error.meta?.field_name ?? '');
    const cause = String(error.meta?.cause ?? '');
    return `${field} ${cause} ${error.message}`.toLowerCase();
}

export function prismaHintIncludes(
    error: PrismaClientKnownRequestError,
    ...needles: string[]
): boolean {
    const hint = prismaRelationHint(error);
    return needles.some((needle) => hint.includes(needle.toLowerCase()));
}

export function isNestedConnectFailure(
    error: PrismaClientKnownRequestError,
): boolean {
    return prismaHintIncludes(error, 'nested connect', 'inline connect');
}

export function prismaMissingRecordModel(
    error: PrismaClientKnownRequestError,
): string | null {
    const text = `${error.meta?.cause ?? ''} ${error.message}`;
    const match = text.match(/No '(\w+)' record/i);
    return match?.[1]?.toLowerCase() ?? null;
}
