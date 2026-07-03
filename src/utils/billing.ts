import { Currency } from "@/interfaces/Plan";
import { Subscription } from "@/interfaces/Subscription";

export function resolveActiveCurrency(subscription?: Subscription): Currency {
  return subscription?.active && subscription?.currency
    ? subscription.currency
    : Currency.EUR;
}
