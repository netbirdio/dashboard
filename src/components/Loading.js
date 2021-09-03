import React from "react";
import loading from "../assets/bars.svg";

const Loading = () => (
    <div>

        <div className="flex h-screen items-center justify-center" >
            <img src={loading} alt="Loading" width="50" height="50"/>
        </div>
    </div>
);

export default Loading;
