import React, {useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import { actions as peerActions } from '../store/peer';
import {
    Col,
    Row,
    Typography,
    Space,
    Button, Drawer, Form, Select, Tag
} from "antd";
import type { CustomTagProps } from 'rc-select/lib/BaseSelect'
import {useAuth0} from "@auth0/auth0-react";
import {PeerGroupsToSave} from "../store/peer/types";
import {Group, GroupPeer} from "../store/group/types";

const { Paragraph } = Typography;
const { Option } = Select;

const PeerGroupsUpdate = () => {
    const { getAccessTokenSilently } = useAuth0()
    const dispatch = useDispatch()
    const groups =  useSelector((state: RootState) => state.group.data)
    const peer =   useSelector((state: RootState) => state.peer.peer)
    const updateGroupsVisible = useSelector((state: RootState) => state.peer.updateGroupsVisible)
    const savedGroups = useSelector((state: RootState) => state.peer.savedGroups)

    const [tagGroups, setTagGroups] = useState([] as string[])
    const [selectedTagGroups, setSelectedTagGroups] = useState([] as string[])
    const [peerGroups, setPeerGroups] = useState([] as GroupPeer[])
    const [peerGroupsToSave, setPeerGroupsToSave] = useState({
        ID: '',
        groupsNoId: [],
        groupsToSave: [],
        groupsToRemove: [],
        groupsToAdd: []
    } as PeerGroupsToSave)

    const [form] = Form.useForm()

    useEffect(() => {
        if (!peer) return
        const gs = peer?.Groups?.map(g => ({ID: g?.ID || '', Name: g.Name} as GroupPeer)) as GroupPeer[]
        const gs_name = gs?.map(g => g.Name) as string[]
        setPeerGroups(gs)
        setSelectedTagGroups(gs_name)
        form.setFieldsValue({
            groups: gs_name
        })
    }, [peer])

    useEffect(() => {
        setTagGroups(groups?.map(g => g.Name) || [])
    }, [groups])

    useEffect(() => {
        const groupsToRemove = peerGroups.filter(pg => !selectedTagGroups.includes(pg.Name)).map(g => g.ID)
        const groupsToAdd = (groups as Group[]).filter(g => selectedTagGroups.includes(g.Name) && !groupsToRemove.includes(g.ID || '') && !peerGroups.find(pg => pg.ID === g.ID)).map(g => g.ID) as string[]
        const groupsNoId = selectedTagGroups.filter(stg => !groups.find(g => g.Name === stg))
        setPeerGroupsToSave({
            ...peerGroupsToSave,
            ID: peer?.ID || '',
            groupsToRemove,
            groupsToAdd,
            groupsNoId
        })
    }, [selectedTagGroups])

    const tagRender = (props: CustomTagProps) => {
        const { label, value, closable, onClose } = props;
        const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
            event.preventDefault();
            event.stopPropagation();
        };

        return (
            <Tag
                color="blue"
                onMouseDown={onPreventMouseDown}
                closable={closable}
                onClose={onClose}
                style={{ marginRight: 3 }}
            >
                <strong>{value}</strong>
            </Tag>
        );
    }

    const optionRender = (label: string) => {
        let peersCount = ''
        const g = groups.find(_g => _g.Name === label)
        if (g)  peersCount = ` - ${g.PeersCount || 0} ${(g.PeersCount && parseInt(g.PeersCount) > 1) ? 'peers' : 'peer'} `
        return (
            <>
                <Tag
                    color="blue"
                    style={{ marginRight: 3 }}
                >
                    <strong>{label}</strong>
                </Tag>
                <span style={{fontSize: ".85em"}}>{peersCount}</span>
            </>
        )
    }

    const setUpdateGroupsVisible = (status:boolean) => {
        dispatch(peerActions.setUpdateGroupsVisible(status));
    }

    const onCancel = () => {
        dispatch(peerActions.setPeer(null))
        setUpdateGroupsVisible(false)
    }

    const onChange = (data:any) => {
        //setFormRule({...formRule, ...data})
    }

    const handleChangeTags = (value: string[]) => {
        setSelectedTagGroups(value)
    };

    const handleFormSubmit = () => {
        form.validateFields()
            .then((values) => {
                dispatch(peerActions.saveGroups.request({getAccessTokenSilently, payload: peerGroupsToSave}))
            })
            .catch((errorInfo) => {
                console.log('errorInfo', errorInfo)
            });
    }

    return (
        <>
            {peer &&
                <Drawer
                    title={`${peer.Name}`}
                    forceRender={true}
                    visible={true}
                    bodyStyle={{paddingBottom: 80}}
                    onClose={onCancel}
                    autoFocus={true}
                    footer={
                        <Space style={{display: 'flex', justifyContent: 'end'}}>
                            <Button onClick={onCancel} disabled={savedGroups.loading}>Cancel</Button>
                            <Button type="primary" disabled={savedGroups.loading} onClick={handleFormSubmit}>Save</Button>
                        </Space>
                    }
                >
                    <Form layout="vertical" hideRequiredMark form={form} onValuesChange={onChange}>
                        <Row gutter={16}>
                            <Col span={24}>
                                <Form.Item
                                    name="groups"
                                    label="Groups"
                                    rules={[{required: true, message: 'Please enter ate least one group'}]}
                                    style={{display: 'flex'}}
                                >
                                    <Select mode="tags"  style={{ width: '100%' }} placeholder="Select groups..." tagRender={tagRender} onChange={handleChangeTags}>
                                        {
                                            tagGroups.map(m =>
                                                <Option key={m}>{optionRender(m)}</Option>
                                            )
                                        }
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                </Drawer>
            }
        </>
    )
}

export default PeerGroupsUpdate