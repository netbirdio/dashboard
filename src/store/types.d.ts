import { StateType, ActionType } from 'typesafe-actions';

declare module 'typesafe-actions' {
  export type RootState = StateType<
    ReturnType<typeof import('./root-reducer').default>
  >;
  export type RootAction = ActionType<typeof import('./root-action').default>;

  interface Types {
    RootAction: RootAction;
  }
}
