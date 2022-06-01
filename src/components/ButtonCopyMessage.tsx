import {copyToClipboard} from "../utils/common";
import {Button, message} from "antd";
import {StepCommand} from "./addpeer/types";
import React from "react";

type Props = {
    keyMessage: string;
    text: string;
    messageText: string;
    styleNotification?: any;
    style?: any;
    className?:any;
};

const ButtonCopyMessage:React.FC<Props> = ({ keyMessage, text, messageText, styleNotification, style, className}) => {
    const copyTextMessage = () => {
        copyToClipboard(text)
        message.success({ content: `${messageText}`, key: keyMessage, duration: 1, style: (styleNotification || {}) });
    }
    return (
        <Button type="text" onClick={copyTextMessage} style={style || {}} className={className}>{text}</Button>
    )
}

export default ButtonCopyMessage