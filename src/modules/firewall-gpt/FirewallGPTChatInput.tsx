import { Textarea } from "@components/Textarea";
import useAutosizeTextArea from "@hooks/useAutosizeTextArea";
import cn from "classnames";
import { Loader2, SendHorizonal } from "lucide-react"; // Adjust the import as necessary
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

type FirewallGPTChatInputProps = {
  onSend: (prompt: string) => void;
  isLoading?: boolean;
};

const FirewallGPTChatInput = forwardRef<
  HTMLTextAreaElement,
  FirewallGPTChatInputProps
>(({ onSend, isLoading }, ref) => {
  const [value, setValue] = useState("");

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  useAutosizeTextArea(textAreaRef.current, value);
  useImperativeHandle(ref, () => textAreaRef.current as HTMLTextAreaElement);

  // Add event listener to set value from outside
  useEffect(() => {
    const handleSetValue = (event: CustomEvent) => {
      setValue(event.detail);
    };
    window.addEventListener("setChatInput", handleSetValue as EventListener);
    return () => {
      window.removeEventListener(
        "setChatInput",
        handleSetValue as EventListener,
      );
    };
  }, []);

  return (
    <div
      className={cn(
        "w-full border-0 border-nb-gray-900 py-5 px-6 group relative",
        isLoading && "animate-pulse",
      )}
    >
      <Textarea
        onKeyDownCapture={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.shiftKey)) return;
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            onSend(value);
          }
        }}
        disabled={isLoading}
        ref={textAreaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={"Write your prompt here..."}
        rows={1}
        className={"pr-14 group"}
        variant={"darker"}
        customElement={
          <div
            className={
              "absolute right-0 top-0 flex  items-end justify-end h-full"
            }
          >
            <button
              className={cn(
                value.length > 3 && "group-focus-within:flex cursor-pointer",
                "items-center justify-center pr-2 pb-2",
                !isLoading && "hidden",
              )}
              onClick={() => onSend(value)}
            >
              <div
                className={cn(
                  "bg-nb-gray-800/20 p-1.5 rounded-md",
                  value.length > 3 && "bg-nb-gray-800/70 hover:bg-nb-gray-800",
                )}
              >
                {isLoading ? (
                  <Loader2
                    size={16}
                    className={"text-nb-gray-300 animate-spin"}
                  />
                ) : (
                  <SendHorizonal size={16} className={"text-nb-gray-300"} />
                )}
              </div>
            </button>
          </div>
        }
      />
    </div>
  );
});

FirewallGPTChatInput.displayName = "FirewallGPTChatInput";

export default FirewallGPTChatInput;
