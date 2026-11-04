import type { StaffResponse } from './staff.types.js';

export type PublicStaff = StaffResponse;

export type AuthTokens = {
    accessToken: string;
    refreshToken: string;
};

export type StaffLoginData = AuthTokens & {
    staff: PublicStaff;
};
