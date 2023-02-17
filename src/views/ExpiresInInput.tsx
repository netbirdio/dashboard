import {Input, Select, Space} from 'antd';
import React, {useState} from 'react';

const {Option} = Select;

export interface ExpiresInValue {
    number?: number;
    interval?: string;
}

export interface SelectOption {
    key: string,
    title: string
}

interface ExpiresInInputProps {
    value?: ExpiresInValue;
    onChange?: (value: ExpiresInValue) => void;
    options: SelectOption[];
}

const ExpiresInInput: React.FC<ExpiresInInputProps> = ({
                                                           value = {},
                                                           onChange,
                                                           options
                                                       }) => {
    const [number, setNumber] = useState(60);
    const [interval, setInterval] = useState("day");

    const triggerChange = (changedValue: { number?: number; interval?: string }) => {
        onChange?.({number, interval, ...value, ...changedValue});
    };

    const onNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newNumber = parseInt(e.target.value || '0', 10);
        setNumber(newNumber);
        triggerChange({number: newNumber});
    };

    const onIntervalChange = (newInterval: string) => {
        setInterval(newInterval);
        triggerChange({interval: newInterval});
    };

    return (
        <Space>
            <Input
                type="number"
                value={value.number || number}
                onChange={onNumberChange}
            />
            <Select style={{width: "100%"}}
                    value={value?.interval || interval}
                    onChange={onIntervalChange}>
                {options.map(m =>
                    <Select.Option key={m.key}>{m.title}</Select.Option>)}
            </Select>
        </Space>
    );
};

export default ExpiresInInput;