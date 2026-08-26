import { cn } from "@utils/helpers";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { FirewallGptAnimatedMessageText } from "@/modules/firewall-gpt/FirewallGPTAnimatedMessageText";
import {
  AssistantAvatar,
  UserAvatar,
} from "@/modules/firewall-gpt/FirewallGPTAvatars";

interface Message {
  msg: string;
  children?: React.ReactNode;
  hidden?: boolean;
}

type Props = {
  isLoading?: boolean;
  hideMessage?: boolean;
  messages?: Message[];
  isUser?: boolean;
  delay?: number;
};

export const FirewallGptMessage = ({
  isLoading = true,
  hideMessage = false,
  messages,
  isUser = false,
  delay = 0,
}: Props) => {
  const variants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
    },
  };

  const [show, setShow] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShow(true);
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  const isNotLoadingAndHasMessages = !isLoading && messages;

  const Avatar = useCallback(
    () => (isUser ? <UserAvatar /> : <AssistantAvatar />),
    [isUser],
  );

  return (
    <div>
      {show && (
        <span className={"flex gap-4"}>
          <Avatar />
          {!hideMessage && (
            <div
              className={cn(
                "flex-col gap-2 flex w-full mt-[0.15rem]",
                isLoading && "animate-pulse",
              )}
            >
              <span>
                {isNotLoadingAndHasMessages &&
                  messages.map((message, index) => {
                    const isHidden = message.hidden || false;
                    const multiplier = (index / message.msg.length) * 800 + 1;
                    if (isHidden) return;

                    return (
                      <span key={index}>
                        <FirewallGptAnimatedMessageText
                          message={message.msg}
                          delay={index != 0 ? multiplier * 1.35 : 0}
                          index={index}
                        >
                          {message.children}
                        </FirewallGptAnimatedMessageText>
                      </span>
                    );
                  })}
              </span>

              {isLoading && (
                <>
                  <LoadingLine />
                  <LoadingLine />
                  <LoadingLine />
                </>
              )}
            </div>
          )}
        </span>
      )}
    </div>
  );
};

const LoadingLine = () => {
  return (
    <Skeleton
      className={
        "rounded-md top-0 relative border border-nb-gray-900/0 flex flex-col w-full"
      }
      height={20}
      containerClassName={"flex"}
    />
  );
};
