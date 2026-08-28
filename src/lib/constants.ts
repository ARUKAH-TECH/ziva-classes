// Plain shared constants/types — kept out of "use server" action files,
// which may only export async functions at runtime.

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export type SessionType = "CENTER" | "HOME_SERVICE" | "ONLINE";
