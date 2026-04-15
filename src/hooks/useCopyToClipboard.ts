import { notify } from "@components/Notification";
import { useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export default function useCopyToClipboard(textToCopy?: string) {
  const { t } = useI18n();
  const wrapper = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const copyToClipboard = async (
    description = t("common.textCopied"),
  ) => {
    const copy = textToCopy ? textToCopy : wrapper.current?.innerText;
    if (!copy) return;
    try {
      await navigator.clipboard.writeText(copy);
      setCopied(true);

      notify({
        title: t("common.copiedToClipboard"),
        description: description,
      });

      const timeout = setTimeout(() => {
        setCopied(false);
        clearTimeout(timeout);
      }, 400);
    } catch (err) {
      return;
    }
  };

  return [wrapper, copyToClipboard, copied] as const;
}
