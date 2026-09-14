// Management describes a pending-approval refusal in prose, because its error
// response carries nothing but a message and a code. This phrase is the part of
// that sentence we match on; it must stay in step with
// NewUserPendingApprovalError in the netbird repo.
const PENDING_APPROVAL_PHRASE = "pending approval";

export const isPendingApprovalError = (message?: string): boolean =>
  !!message?.toLowerCase().includes(PENDING_APPROVAL_PHRASE);
