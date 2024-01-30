import { notify } from "@components/Notification";
import { useRef, useState } from "react";

export default function useCopyToClipboard(textToCopy?: string) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const copyToClipboard = async (
    description = "Text has been copied to your clipboard.",
  ) => {
    const copy = textToCopy ? textToCopy : wrapper.current?.innerText;
    if (!copy) return;
    try {
      await navigator.clipboard.writeText(copy);
      setCopied(true);

      notify({
        title: "Copied to clipboard",
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
