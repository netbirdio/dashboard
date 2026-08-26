import { MessageCirclePlus, Sparkles } from "lucide-react";
import * as React from "react";

type Props = {
  onNewChatClick?: () => void;
  showNewChatButton?: boolean;
};
export const FirewallGptHeader = ({
  onNewChatClick,
  showNewChatButton,
}: Props) => {
  return (
    <div className={"z-10 relative border-b border-nb-gray-900 pb-1.5"}>
      <div className={"flex justify-between px-5 items-center"}>
        <div className={"flex items-center gap-3"}>
          <div
            className={
              "h-9 w-9 flex items-center justify-center rounded-md relative overflow-hidden p-[2px]"
            }
          >
            <span
              className={
                "w-full h-full  animated-gradient-bg absolute z-0 opacity-100"
              }
            ></span>
            <div
              className={
                "w-full h-full z-10 relative flex items-center justify-center bg-nb-gray-930/30 rounded-[4px]"
              }
            >
              <Sparkles size={16} className={"relative z-20"} />
            </div>
          </div>
          <div className={"flex flex-col"}>
            <h2 className={"text-base my-0 leading-[1.5 text-center]"}>
              Smart Firewall
              <span
                className={
                  "bg-nb-blue-800 text-[10px] relative -top-[2px] text-nb-blue-400 uppercase px-[6px] py-[2px] rounded-md ml-2 font-semibold tracking-wider"
                }
              >
                Beta
              </span>
            </h2>
            <span className={"text-xs text-nb-gray-400 my-0"}>
              Effortlessly create access control policies using natural language
              prompts
            </span>
          </div>
        </div>
        {showNewChatButton && (
          <div>
            <NewChatButton onClick={onNewChatClick} />
          </div>
        )}
      </div>
      <div className={"flex justify-center items-center gap-4 mt-2"}></div>
    </div>
  );
};

const NewChatButton = ({ onClick }: { onClick?: () => void }) => {
  return (
    <button
      className={
        "bg-nb-gray-900 hover:bg-nb-gray-900 hover:text-white px-4 py-2 rounded-md text-xs flex gap-2 leading-none items-center text-nb-gray-200 transition-all"
      }
      onClick={onClick}
    >
      <MessageCirclePlus size={14} />
      New Chat
    </button>
  );
};
