enum ActionStatus {
  SUCCESS = "green",
  ERROR = "red",
  INFO = "blue-darker",
  WARNING = "netbird",
}

const ACTION_COLOR_MAPPING: Record<string, ActionStatus> = {
  // Success actions
  add: ActionStatus.SUCCESS,
  join: ActionStatus.SUCCESS,
  invite: ActionStatus.SUCCESS,
  create: ActionStatus.SUCCESS,
  approve: ActionStatus.SUCCESS,
  complete: ActionStatus.SUCCESS,
  activate: ActionStatus.SUCCESS,

  // Error actions
  delete: ActionStatus.ERROR,
  revoke: ActionStatus.ERROR,
  remove: ActionStatus.ERROR,
  block: ActionStatus.ERROR,
  reject: ActionStatus.ERROR,

  // Warning actions
  overuse: ActionStatus.WARNING,
  expire: ActionStatus.WARNING,

  // Info actions
  update: ActionStatus.INFO,
  enable: ActionStatus.INFO,
  disable: ActionStatus.INFO,
  rename: ActionStatus.INFO,
  unblock: ActionStatus.INFO,
  login: ActionStatus.INFO,
};

export function getColorFromCode(code: string): string {
  try {
    const matchingAction = Object.keys(ACTION_COLOR_MAPPING).find((action) =>
      code.includes(action),
    );

    return matchingAction
      ? ACTION_COLOR_MAPPING[matchingAction]
      : ActionStatus.INFO;
  } catch (error) {
    return ActionStatus.INFO;
  }
}
