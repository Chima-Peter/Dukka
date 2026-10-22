/** Pending staff invitations expire after 1 day. */
export const STAFF_INVITATION_TTL_SECONDS = 24 * 60 * 60;

/** Staff web app path that reads `token` from the query string. */
export const STAFF_INVITATION_ACCEPT_PATH = '/invitations/accept';
