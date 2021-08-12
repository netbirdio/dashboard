import React from "react";
import {BsThreeDots} from "react-icons/all";
import {Button} from "react-bootstrap";

const TableOptionsButton = React.forwardRef(({children, onClick}, ref) => (
    <Button variant="light"
            ref={ref}
            onClick={(e) => {
                e.preventDefault();
                onClick(e);
            }}
    >
        <BsThreeDots/>
        {children}
    </Button>
));

export default TableOptionsButton