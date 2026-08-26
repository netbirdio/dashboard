import { cn } from "@utils/helpers";
import * as React from "react";
import { useMemo } from "react";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";
import { FirewallGptMessage } from "@/modules/firewall-gpt/FirewallGptMessage";

type Props = {
  policy: Policy;
};
export const FirewallGptResponseMessage = ({ policy }: Props) => {
  const rule = useMemo(() => {
    try {
      return policy.rules[0];
    } catch (error) {
      return undefined;
    }
  }, [policy]);

  const hasPorts = rule && rule?.ports?.length > 0;
  const hasMultiplePorts = rule && rule?.ports?.length > 1;
  const isUsingICMPOrAll =
    rule?.protocol === "icmp" || rule?.protocol === "all";
  const isUsingICMP = rule?.protocol === "icmp";

  const Ports = () => (
    <>
      {rule?.ports?.map((port, index) => (
        <React.Fragment key={index}>
          {index > 0 && ", "}
          <HighlightedText>{port}</HighlightedText>
        </React.Fragment>
      ))}
    </>
  );

  const SourceGroups = () => (
    <>
      {rule?.sources?.map((g, index) => {
        const group = g as Group;
        return (
          <React.Fragment key={index}>
            {index > 0 && ", "}
            <HighlightedText>{group?.name}</HighlightedText>
          </React.Fragment>
        );
      })}
    </>
  );
  const hasMultipleSourceGroups =
    rule && rule?.sources && rule?.sources?.length > 1;

  const hasSourceGroups = rule && rule?.sources && rule?.sources?.length;

  const DestinationGroups = () => (
    <>
      {rule?.destinations?.map((g, index) => {
        const group = g as Group;
        return (
          <React.Fragment key={index}>
            {index > 0 && ", "}
            <HighlightedText>{group?.name}</HighlightedText>
          </React.Fragment>
        );
      })}
    </>
  );
  const hasMultipleDestinationGroups =
    rule && rule?.destinations && rule?.destinations?.length > 1;
  const hasDestinationGroups =
    rule && rule?.destinations && rule?.destinations?.length > 0;

  return (
    rule && (
      <FirewallGptMessage
        isLoading={false}
        messages={[
          /**
           * Policy Name & Direction
           */
          {
            msg: "I will create the ",
            children: <HighlightedText>{policy.name}</HighlightedText>,
          },
          {
            msg: ` policy that allows ${
              rule.bidirectional ? "bidirectional" : "only one-way"
            } traffic. `,
          },
          /**
           * Policy Ports
           */
          {
            msg: `It's configured to allow connections  ${
              hasMultiplePorts ? "through ports" : "through port"
            } `,
            children: <Ports />,
            hidden: !hasPorts,
          },
          {
            msg: " using the ",
            children: (
              <HighlightedText className={"uppercase"}>
                {rule.protocol}
              </HighlightedText>
            ),
            hidden: !hasPorts,
          },
          {
            msg: " protocol. ",
            hidden: !hasPorts,
          },
          /**
           * No Policy Ports
           */
          {
            msg: `It's configured to allow connections through ${
              isUsingICMP ? "the" : ""
            }`,
            children: (
              <HighlightedText className={"uppercase"}>
                {rule.protocol}
              </HighlightedText>
            ),
            hidden: !isUsingICMPOrAll,
          },
          {
            msg: `${isUsingICMP ? " protocol. " : " protocols."}`,
            hidden: !isUsingICMPOrAll,
          },
          /**
           * Policy Groups
           */
          {
            hidden: !hasSourceGroups || !hasDestinationGroups,
            msg: ` ${
              hasMultipleSourceGroups
                ? "The authorized source groups"
                : "The authorized source group"
            } `,
            children: <SourceGroups />,
          },
          {
            hidden: !hasSourceGroups || !hasDestinationGroups,
            msg: ` ${
              hasMultipleDestinationGroups
                ? "can connect to the destinations of the groups "
                : "can connect to the destination of the group"
            } `,
            children: <DestinationGroups />,
          },
        ]}
      />
    )
  );
};

function HighlightedText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block text-sm text-netbird font-medium relative px-1.5 py-0.5",
        className,
      )}
    >
      <span
        className={
          "absolute w-full h-full bg-gradient-to-r from-netbird-500/5 to-amber-300/5 rounded-md left-0 top-0"
        }
      ></span>
      {children}
    </span>
  );
}
