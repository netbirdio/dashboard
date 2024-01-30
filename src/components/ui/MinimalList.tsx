import Card from "@components/Card";
import { cn } from "@utils/helpers";
import * as React from "react";

type Props = {
  data: {
    label: string;
    value: string;
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
              copy
              label={item.label}
              value={item.value}
              key={index}
            />
          );
        })}
      </Card.List>
    </Card>
  );
};
