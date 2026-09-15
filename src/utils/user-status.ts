// Management describes both refusals in prose, because its error response
// carries nothing but a message and a code. These phrases are the parts of
// those sentences we match on; they must stay in step with
// NewUserPendingApprovalError and NewUserBlockedError in the netbird repo.
const PENDING_APPROVAL_PHRASE = "pending approval";
const BLOCKED_PHRASE = "blocked";

export const isPendingApprovalError = (message?: string): boolean =>
  !!message?.toLowerCase().includes(PENDING_APPROVAL_PHRASE);

export const isBlockedError = (message?: string): boolean =>
  !!message?.toLowerCase().includes(BLOCKED_PHRASE);

// A user refused for either reason cannot load anything, so the app routes them
// to a screen rather than treating it as one call's failure.
export const isUserStatusError = (message?: string): boolean =>
  isPendingApprovalError(message) || isBlockedError(message);
