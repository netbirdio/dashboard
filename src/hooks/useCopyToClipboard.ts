import { notify } from "@components/Notification";
import { useRef, useState } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";

export default function useCopyToClipboard(textToCopy?: string) {
  const t = useTranslations();

  const wrapper = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const copyToClipboard = async (description = t("components.copiedText")) => {
    const copy = textToCopy ? textToCopy : wrapper.current?.innerText;
    if (!copy) return;
    try {
      await navigator.clipboard.writeText(copy);
      setCopied(true);

      notify({
        title: t("components.copiedTitle"),
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
