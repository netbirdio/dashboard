import {useState} from "react";

export const usePageSizeHelpers = () => {

    const [pageSize, setPageSize] = useState(10);

    const onChangePageSize = (value: string) => {
        setPageSize(parseInt(value.toString()))
    }

    const pageSizeOptions = [
        {label: "10", value: "10"},
        {label: "25", value: "25"},
        {label: "50", value: "50"},
        {label: "100", value: "100"},
        {label: "1000", value: "1000"}
    ]

    return {
        onChangePageSize,
        pageSize,
        pageSizeOptions
    }
}