import { useState } from "react";
import { storeFilterState } from "./filterState";

export const usePageSizeHelpers = () => {
  const [pageSize, setPageSize] = useState(10);

  const onChangePageSize = (value: string, pageName: string) => {
    setPageSize(parseInt(value.toString()));
    storeFilterState(pageName, "pageSize", parseInt(value.toString()));
  };

  const pageSizeOptions = [
    { label: "10", value: "10" },
    { label: "25", value: "25" },
    { label: "50", value: "50" },
    { label: "100", value: "100" },
    { label: "1000", value: "1000" },
  ];

  return {
    onChangePageSize,
    pageSize,
    pageSizeOptions,
  };
};
