import apiClient from "./client";

// Export all API modules
export { eventsApi } from "./events";
export type { Event } from "./events";
export { giftsApi } from "./gifts";
export type { Gift } from "./gifts";
export { decipherApi } from "./decipher";
export type { DecipherResult } from "./decipher";
export { invitesApi } from "./invites";
export type { Invite } from "./invites";

export default apiClient;
