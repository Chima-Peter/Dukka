import type { StaffResponse } from '../staff.service.js';

export type PublicStaff = StaffResponse;

export type AuthTokens = {
    accessToken: string;
    refreshToken: string;
};

export type StaffLoginData = AuthTokens & {
    staff: PublicStaff;
};
