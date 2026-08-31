/** Client-side onboarding hint only. Account-level onboarding state remains authoritative on the server. */
function keyFor(userId?: string|null): string { return userId ? `shadecode_onboarded:${userId}` : "shadecode_onboarded"; }
export function getOnboardingStatus(userId?: string|null): boolean { if(typeof window==='undefined')return false; return localStorage.getItem(keyFor(userId))==='true'; }
export function setOnboardingComplete(userId?: string|null): void { if(typeof window!=='undefined')localStorage.setItem(keyFor(userId),'true'); }
export function clearOnboardingComplete(userId?: string|null): void { if(typeof window!=='undefined')localStorage.removeItem(keyFor(userId)); }
