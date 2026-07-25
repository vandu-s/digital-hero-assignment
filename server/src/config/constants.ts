/**
 * The "System" user attributes leads submitted through the public,
 * unauthenticated landing-page form (Lead.createdById is a required FK,
 * so anonymous submissions still need an owning user). It has no real
 * login purpose - nobody signs in as this account day-to-day.
 */
export const SYSTEM_USER_EMAIL = "system@crm.internal";
