export interface Plan {
  name: string;
  description: string;
  features: string[];
  prices: Price[];
  free: boolean;
}

export interface Price {
  currency: Currency;
  price: number;
  price_id: string;
  unit: string;
}

export enum Currency {
  USD = "usd",
  EUR = "eur",
}
