import {copyToClipboard} from "../utils/common";
import {Button, message} from "antd";
import {StepCommand} from "./addpeer/types";
import React from "react";

type Props = {
    key: any;
    text: string;
    messageText: string;
    styleNotification?: any;
    style?: any;
    className?:any;
};

const ButtonCopyMessage:React.FC<Props> = ({ key, text, messageText, styleNotification, style, className}) => {
    const copyTextNotification = () => {
        copyToClipboard(text)
        message.success({ content: `${messageText}`, key: key, duration: 1, style: (styleNotification || {}) });
    }
    return (
        <Button type="text" onClick={copyTextNotification} style={style || {}} className={className}>{text}</Button>
    )
}

export default ButtonCopyMessage