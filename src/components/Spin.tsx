import React from "react";
import {SpinProps} from "antd";

const TableSpin = (loading: boolean): SpinProps => {
    return {
        spinning: loading,
        delay: 1,
        size: "large"
    }
}

export default TableSpin;
