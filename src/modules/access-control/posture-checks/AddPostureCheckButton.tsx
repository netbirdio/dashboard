import Button from "@components/Button";
import { PlusCircle } from "lucide-react";
import * as React from "react";
import { useState } from "react";

type Props = {};
export const AddPostureCheckButton = ({}: Props) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <Button variant={"primary"} size={"xs"}>
      <PlusCircle size={14} />
      Add new check
    </Button>
  );
};
