import {
  render as renderWithTestingLibrary,
  type RenderOptions,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import React from "react";
import messages from "@/i18n/messages/en";

export * from "@testing-library/react";

export function render(
  ui: React.ReactNode,
  { wrapper: Wrapper, ...options }: RenderOptions = {},
) {
  return renderWithTestingLibrary(ui, {
    ...options,
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
        {Wrapper ? <Wrapper>{children}</Wrapper> : children}
      </NextIntlClientProvider>
    ),
  });
}
