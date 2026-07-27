import en from "./messages/en";

type Messages = typeof en;

declare global {
  interface IntlMessages extends Messages {}
}

export {};
