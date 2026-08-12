import { notify } from "@components/Notification";
import { useRef, useState } from "react";

/**
 * `silent` suppresses the toast for copies whose confirmation is already on
 * screen — a button that swaps to a ✓ next to the thing it copied doesn't need
 * the corner of the app to say so as well.
 */
export default function useCopyToClipboard(
  textToCopy?: string,
  options?: { silent?: boolean },
) {
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

      if (!options?.silent) {
        notify({
          title: "Copied to clipboard",
          description: description,
        });
      }

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
