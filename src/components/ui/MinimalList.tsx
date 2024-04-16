import Card from "@components/Card";
import { cn } from "@utils/helpers";
import * as React from "react";

type Props = {
  data: {
    label: string;
    value: string | React.ReactNode;
    noCopy?: boolean;
    tooltip?: boolean;
  }[];
  className?: string;
};
export const MinimalList = ({ data, className }: Props) => {
  return (
    <Card className={cn("w-full mb-3 z-0", className)}>
      <Card.List>
        {data.map((item, index) => {
          return (
            <Card.ListItem
              copy={!item.noCopy}
              label={item.label}
              value={item.value}
              key={index}
              tooltip={item.tooltip !== false}
            />
          );
        })}
      </Card.List>
    </Card>
  );
};
