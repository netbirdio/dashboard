import { cn } from "@utils/helpers";
import { cva, VariantProps } from "class-variance-authority";
import Link, { LinkProps } from "next/link";
import React from "react";

export type InlineLinkProps = VariantProps<typeof linkVariants>;

interface Props extends LinkProps, InlineLinkProps {
  children: React.ReactNode;
  className?: string;
  target?: "_blank" | "_self" | "_parent" | "_top";
}

const linkVariants = cva("", {
  variants: {
    variant: {
      default: "text-netbird hover:underline font-normal",
      faded: "text-nb-gray-400 hover:text-nb-gray-300 hover:underline",
    },
  },
});

export default function InlineLink({ variant = "default", ...props }: Props) {
  return (
    <Link
      {...props}
      className={cn(
        "underline-offset-4 texts-inherit gap-1 items-center transition-all duration-200 inline-flex",
        props.className,
        linkVariants({ variant }),
      )}
    >
      {props.children}
    </Link>
  );
}
