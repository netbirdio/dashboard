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

export const secondsToExpiresIn = (expiresIn: number, availableOptions: string[]): ExpiresInValue => {

    if (expiresIn == 0) {
        return {interval: "day", number: 0}
    }

    let result = {interval: "hour", number: expiresIn / 3600}
    availableOptions.forEach(opt => {
        if (opt === "year" && (expiresIn % 31104000 === 0)) {
            result = {interval: "year", number: expiresIn / 31104000}
        } else if (opt === "month" && (expiresIn % 2592000 === 0)) {
            result =  {interval: "month", number: expiresIn / 2592000}
        } else if (opt === "day" && (expiresIn % 86400 === 0)) {
            result =  {interval: "day", number: expiresIn / 86400}
        } else if (opt === "hour" && (expiresIn % 3600 === 0)) {
            result =  {interval: "hour", number: expiresIn / 3600}
        }
    })
    return result
}

export const expiresInToSeconds = (expiresIn: ExpiresInValue): number => {
    if (!expiresIn.number || !expiresIn.interval) {
        return 0
    }
    let multiplier = 0
    switch (expiresIn.interval.toLowerCase()) {
        case "hour":
            multiplier = 3600
            break
        case "day":
            multiplier = 24 * 3600
            break
        case "week":
            multiplier = 7 * 24 * 3600
            break
        case "month":
            multiplier = 30 * 24 * 3600
            break
        case "year":
            multiplier = 365 * 24 * 3600
            break
        default:
            multiplier = 0
    }

    return expiresIn.number * multiplier

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