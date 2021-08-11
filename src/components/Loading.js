import React from "react";
import loading from "../assets/bars.svg";

const Loading = () => (
    <div>
        <div className="spinner">
            <img src={loading} alt="Loading" width="50" height="50"/>
        </div>
    </div>
);

export default Loading;
