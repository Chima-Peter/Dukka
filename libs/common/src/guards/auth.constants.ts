export const REQUEST_USER_KEY = 'user';
export const STAFF_JWT_SERVICE = 'STAFF_JWT_SERVICE';

export const blacklistedTokenKey = (token: string) =>
    `blacklisted:token:${token}`;
