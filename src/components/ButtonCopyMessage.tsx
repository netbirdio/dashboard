import {copyToClipboard} from "../utils/common";
import {Button, message, Typography} from "antd";
import React, {ReactNode} from "react";

const {Text} = Typography;

type Props = {
    keyMessage: string;
    toCopy: string;
    body: ReactNode;
    messageText: string;
    styleNotification?: any;
    style?: any;
    className?: any;
};

const ButtonCopyMessage: React.FC<Props> = ({
                                                keyMessage,
                                                toCopy,
                                                body,
                                                messageText,
                                                styleNotification,
                                                style,
                                                className
                                            }) => {
    const copyTextMessage = () => {
        copyToClipboard(toCopy)
        message.success({content: `${messageText}`, key: keyMessage, duration: 1, style: (styleNotification || {})});
    }
    return (
        <Button type="text" onClick={copyTextMessage} style={style || {}} className={className}>
            {body}
        </Button>
    )
}

export default ButtonCopyMessage