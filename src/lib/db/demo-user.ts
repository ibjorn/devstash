// Identifies the seeded demo account. Application queries are scoped to the
// session user, not this — it's here so the seed and the maintenance scripts
// agree on which row is the demo one.
export const DEMO_USER_EMAIL = "demo@devstash.io";
