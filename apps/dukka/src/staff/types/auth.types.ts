import type { StaffResponse } from '../staff.service.js';

export type PublicStaff = StaffResponse;

export type StaffLoginData = {
    accessToken: string;
    staff: PublicStaff;
};
