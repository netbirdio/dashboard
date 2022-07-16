import "highlight.js/styles/mono-blue.css";
import "highlight.js/lib/languages/bash";
import { StepCommand } from './types'
import SyntaxHighlighter from 'react-syntax-highlighter';
import { monoBlue } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import {
    Typography,
    Space,
    Steps, Button
} from "antd";
import {copyToClipboard} from "../../utils/common";
import {CheckOutlined, CopyOutlined} from "@ant-design/icons";
import React, {useEffect, useState} from "react";
const { Step } = Steps;

type Props = {
    stepsItems: Array<StepCommand>
};

const TabSteps:React.FC<Props> = ({stepsItems}) => {

    const [steps, setSteps] = useState(stepsItems)

    useEffect(() => setSteps(stepsItems), [stepsItems])

    const onCopyClick = (key: string | number, commands:React.ReactNode | string, copied: boolean) => {
        if (!(typeof commands === 'string')) return
        copyToClipboard(commands)
        const step = steps.find(s => s.key === key)
        if (step) step.copied = copied
        setSteps([...steps])

        if (copied) {
            setTimeout(() => {
                onCopyClick(key, commands, false)
            }, 2000)
        }
    }

    return (
        <Steps direction="vertical" current={0}>
            {steps.map(c =>
                <Step
                    key={c.key}
                    title={c.title}
                    description={
                        <Space className="nb-code" direction="vertical" size="small" style={{display: "flex"}}>
                            { (c.commands && (typeof c.commands === 'string')) ? (
                            <SyntaxHighlighter language="bash" style={monoBlue}>
                                {c.commands}
                            </SyntaxHighlighter>
                            ) : (
                                c.commands
                            )}
                            { c.showCopyButton &&
                                <>
                                { !c.copied ? (
                                    <Button type="text" size="large" className="btn-copy-code" icon={<CopyOutlined/>}
                                            style={{color: "rgb(107, 114, 128)"}}
                                            onClick={() => onCopyClick(c.key, c.commands, true)}/>
                                ): (
                                    <Button type="text" size="large" className="btn-copy-code" icon={<CheckOutlined/>}
                                            style={{color: "green"}}/>
                                )}
                                </>
                            }

                        </Space>
                    }
                />
            )}
        </Steps>
    )
}

export default TabSteps;