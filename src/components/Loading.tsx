import React from "react";
import loading from "../assets/bars.svg";
import {Space} from "antd";

type Props = {
    padding?: string;
    width?: string;
    height?: string;
};

const Loading:React.FC<Props> = ({padding, width, height}) => (
    <Space direction="vertical" align="center" style={{display: 'flex', padding: `${padding || `.25em`}`}}>
        <img src={loading} alt="Loading" style={{width: `${width || '25px'}`, height: `${height || '25px'}`}}/>
    </Space>
);

export default Loading;
