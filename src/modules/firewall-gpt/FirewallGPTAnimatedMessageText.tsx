import { motion } from "framer-motion";
import * as React from "react";
import { useEffect, useState } from "react";

type Props = {
  message: string;
  children?: React.ReactNode;
  delay?: number;
  index?: number;
};
export const FirewallGptAnimatedMessageText = ({
  message,
  children,
  delay = 0,
  index = 0,
}: Props) => {
  const splitMessageIntoIndividualCharacters = (message?: string) => {
    if (!message) return [];
    return message.split(/(?!$)/u);
  };

  const animatedMessage = splitMessageIntoIndividualCharacters(message);

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

  return (
    show && (
      <motion.span
        animate={"visible"}
        initial={"hidden"}
        variants={variants}
        transition={{
          staggerChildren: 0.007 - index / 1000, // smaller number = faster typing
        }}
      >
        {animatedMessage &&
          animatedMessage.map((char, index) => {
            return (
              <motion.span key={index} variants={variants}>
                <span className={"text-nb-gray-200 font-light text-sm"}>
                  {char}
                </span>
                {index === animatedMessage.length - 1 && (
                  <span>{children}</span>
                )}
              </motion.span>
            );
          })}
      </motion.span>
    )
  );
};
