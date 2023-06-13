import {CustomTagProps} from "rc-select/lib/BaseSelect";
import React, {useEffect, useState} from "react";
import {Col, Divider, Row, Tag} from "antd";
import {useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {RuleObject} from "antd/lib/form";

export const useGetGroupTagHelpers = () => {
    const groups = useSelector((state: RootState) => state.group.data)

    const [tagGroups, setTagGroups] = useState([] as string[])
    const [groupTagFilterAll, setGroupTagFilterAll] = useState(false)
    const [selectedTagGroups, setSelectedTagGroups] = useState([] as string[])

    const blueTagRender = (props: CustomTagProps) => {
        return tagRender(props, "blue")
    }
    const grayTagRender = (props: CustomTagProps) => {
        return tagRender(props, "")
    }

    const tagRender = (props: CustomTagProps, color: string) => {
        const {value, closable, onClose} = props;
        const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
            event.preventDefault();
            event.stopPropagation();
        };

        return (
            <Tag
                color={color}
                onMouseDown={onPreventMouseDown}
                closable={closable}
                onClose={onClose}
                style={{marginRight: 3}}
            >
                {value}
            </Tag>
        );
    }

    const handleChangeTags = (value: string[]) => {
        let validatedValues: string[] = []
        value.forEach(function (v) {
            if (v.trim().length) {
                validatedValues.push(v)
            }
        })
        setSelectedTagGroups(validatedValues)
    };

    const dropDownRender = (menu: React.ReactElement) => (
        <>
            {menu}
            <Divider style={{margin: '8px 0'}}/>
            <Row style={{padding: '0 8px 4px'}}>
                <Col flex="auto">
                    <span style={{color: "#9CA3AF"}}>Add new group by pressing "Enter"</span>
                </Col>
                <Col flex="none">
                    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M1.70455 7.19176V5.89915H10.3949C10.7727 5.89915 11.1174 5.80634 11.429 5.62074C11.7405 5.43513 11.9875 5.18655 12.1697 4.875C12.3554 4.56345 12.4482 4.21875 12.4482 3.84091C12.4482 3.46307 12.3554 3.12003 12.1697 2.81179C11.9841 2.50024 11.7356 2.25166 11.424 2.06605C11.1158 1.88044 10.7727 1.78764 10.3949 1.78764H9.83807V0.5H10.3949C11.0114 0.5 11.5715 0.650805 12.0753 0.952414C12.5791 1.25402 12.9818 1.65672 13.2834 2.16051C13.585 2.6643 13.7358 3.22443 13.7358 3.84091C13.7358 4.30161 13.648 4.73414 13.4723 5.13849C13.3 5.54285 13.0613 5.89915 12.7564 6.20739C12.4515 6.51562 12.0968 6.75758 11.6925 6.93324C11.2881 7.10559 10.8556 7.19176 10.3949 7.19176H1.70455ZM4.90128 11.0646L0.382102 6.54545L4.90128 2.02628L5.79119 2.91619L2.15696 6.54545L5.79119 10.1747L4.90128 11.0646Z"
                            fill="#9CA3AF"/>
                    </svg>
                </Col>
            </Row>
        </>
    )

    const optionRender = (label: string) => {
        let peersCount = "";
        const g = groups.find((_g) => _g.name === label);
        if (g)
            peersCount = ` - ${g.peers_count || 0} ${
                !g.peers_count || parseInt(g.peers_count) !== 1 ? "peers" : "peer"
            } `;
        return (
            <div>
                <Tag color="blue" style={{ marginRight: 3}}>
                    {label}
                </Tag>
                <span style={{ fontSize: ".85em" }}>{peersCount}</span>
            </div>
        );
    };

    const getExistingAndToCreateGroupsLists = (groupNameList: string[]): [string[], string[]] => {
        const groupIDList = groups?.filter(g => groupNameList.includes(g.name)).map(g => g.id || '') || []
        // find groups that do not yet exist (newly added by the user)
        const existingGroupsNames: string[] = groups?.map(g => g.name);
        const groupNameListToCreate = groupNameList.filter(s => !existingGroupsNames.includes(s))
        return [groupIDList, groupNameListToCreate]
    }

    const getGroupNamesFromIDs = (groupIDList: string[]): string[] => {
        if (!groupIDList) {
            return []
        }

        return groups?.filter(g => groupIDList.includes(g.id!)).map(g => g.name || '') || []
    }

    const selectValidator = (obj: RuleObject, value: string[]) => {
        if (!value.length) {
            return Promise.reject(new Error("Please enter at least one group"))
        }

        return selectValidatorEmptyStrings(obj,value)
    }

    const selectValidatorEmptyStrings = (_: RuleObject, value: string[]) => {
        let hasSpaceNamed = []
        value.forEach(function (v: string) {
            if (!v.trim().length) {
                hasSpaceNamed.push(v)
            }
        })

        if (hasSpaceNamed.length) {
            return Promise.reject(new Error("Group names with just spaces are not allowed"))
        }

        return Promise.resolve()
    }

    useEffect(() => {
        if (groupTagFilterAll) {
            setTagGroups(groups?.filter(g => g.name != "All").map(g => g.name) || [])
        } else {
            setTagGroups(groups?.map(g => g.name) || [])
        }
    }, [groups])

    return {
        tagRender,
        blueTagRender,
        grayTagRender,
        handleChangeTags,
        dropDownRender,
        optionRender,
        tagGroups,
        selectedTagGroups,
        setGroupTagFilterAll,
        getExistingAndToCreateGroupsLists,
        getGroupNamesFromIDs,
        selectValidator,
        selectValidatorEmptyStrings
    }
}