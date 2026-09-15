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

// Structurally an ErrorResponse, restated so this module stays free of the api
// module, which reads the runtime config when imported.
type RefusalError = { code: number; message: string };

type Refusal =
  | { kind: "pending"; error: RefusalError }
  | { kind: "blocked"; error: RefusalError }
  | { kind: "undecided" };

type Refusals = {
  currentError?: RefusalError;
  listError?: RefusalError;
  isCurrentLoading: boolean;
  isListLoading: boolean;
};

/**
 * Decides which screen a refused user belongs on, given both calls the
 * dashboard already waits for. Order matters more than speed here: acting on
 * whichever response arrived first is what used to send a pending user to the
 * blocked screen.
 */
export const resolveRefusedUser = ({
  currentError,
  listError,
  isCurrentLoading,
  isListLoading,
}: Refusals): Refusal => {
  // Only /users/current names the owner who can approve, so it wins outright.
  if (isPendingApprovalError(currentError?.message) && currentError) {
    return { kind: "pending", error: currentError };
  }

  // The list says pending on every management version, including the ones that
  // call a pending user merely blocked above — but it carries no owner, so it
  // is used only once nothing better is still on its way.
  if (isCurrentLoading) return { kind: "undecided" };

  if (isPendingApprovalError(listError?.message) && listError) {
    return { kind: "pending", error: listError };
  }

  // Blocked is concluded last, and only once the list has settled: on older
  // management that list is the one thing that would have said otherwise.
  if (isListLoading) return { kind: "undecided" };

  const blocked = [currentError, listError].find((e) =>
    isBlockedError(e?.message),
  );

  return blocked ? { kind: "blocked", error: blocked } : { kind: "undecided" };
};
