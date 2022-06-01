import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import { RootState } from "typesafe-actions";
import { actions as setupKeyActions } from '../store/setup-key';
import Loading from "../components/Loading";
import {Container} from "../components/Container";
import {
    Col,
    Row,
    Typography,
    Table,
    Card,
    Tag,
    Input,
    Space,
    Radio,
    RadioChangeEvent,
    Dropdown,
    Menu,
    Alert, Select, Modal, Button, message, Drawer, Form, List
} from "antd";
import {SetupKey, SetupKeyRevoke} from "../store/setup-key/types";
import {filter, transform} from "lodash"
import {copyToClipboard, formatDate, formatOS, timeAgo} from "../utils/common";
import {ExclamationCircleOutlined} from "@ant-design/icons";
import SetupKeyNew from "../components/SetupKeyNew";
import ButtonCopyMessage from "../components/ButtonCopyMessage";

const { Title, Text, Paragraph } = Typography;
const { Column } = Table;
const { confirm } = Modal;

interface SetupKeyDataTable extends SetupKey {
    key: string
}

export const SetupKeys = () => {
    const { getAccessTokenSilently } = useAuth0()
    const dispatch = useDispatch()

    const setupKeys = useSelector((state: RootState) => state.setupKey.data);
    const failed = useSelector((state: RootState) => state.setupKey.failed);
    const loading = useSelector((state: RootState) => state.setupKey.loading);
    const deletedSetupKey = useSelector((state: RootState) => state.setupKey.deletedSetupKey);
    const revokedSetupKey = useSelector((state: RootState) => state.setupKey.revokedSetupKey);
    const createdSetupKey = useSelector((state: RootState) => state.setupKey.createdSetupKey);

    const [textToSearch, setTextToSearch] = useState('');
    const [optionValidAll, setOptionValidAll] = useState('valid');
    const [pageSize, setPageSize] = useState(5);
    const [dataTable, setDataTable] = useState([] as SetupKeyDataTable[]);
    const [setupKeyToAction, setSetupKeyToAction] = useState(null as SetupKeyDataTable | null);

    const styleNotification = { marginTop: 85 }

    const pageSizeOptions = [
        {label: "5", value: "5"},
        {label: "10", value: "10"},
        {label: "15", value: "15"}
    ]

    const optionsValidAll = [{label: 'Valid', value: 'valid'}, {label: 'All', value: 'all'}]

    const itemsMenuAction = [
        {
            key: "revoke",
            label: (<Button type="text" onClick={() => showConfirmRevoke()}>Revoke</Button>)
        },
        /*{
            key: "delete",
            label: (<Button type="text" onClick={() => showConfirmDelete()}>Delete</Button>)
        }*/
    ]
    const actionsMenu = (<Menu items={itemsMenuAction} ></Menu>)

    const transformDataTable = (d:SetupKey[]):SetupKeyDataTable[] => {
        return d.map(p => ({ key: p.Id, ...p } as SetupKeyDataTable))
    }

    useEffect(() => {
        dispatch(setupKeyActions.getSetupKeys.request({getAccessTokenSilently, payload: null}));
    }, [])

    useEffect(() => {
        setDataTable(transformDataTable(filterDataTable()))
    }, [setupKeys])

    useEffect(() => {
        setDataTable(transformDataTable(filterDataTable()))
    }, [textToSearch, optionValidAll])

    const deleteKey = 'deleting';
    useEffect(() => {
        if (deletedSetupKey.loading) {
            message.loading({ content: 'Deleting...', key: deleteKey, style: styleNotification });
        } else if (deletedSetupKey.success) {
            message.success({ content: 'SetupKey deleted with success!', key: deleteKey, duration: 2, style: styleNotification });
            dispatch(setupKeyActions.setDeleteSetupKey({ ...deletedSetupKey, success: false }));
        } else if (deletedSetupKey.error) {
            message.error({ content: 'Error! Something wrong to delete setupKey.', key: deleteKey, duration: 2, style: styleNotification  });
            dispatch(setupKeyActions.setDeleteSetupKey({ ...deletedSetupKey, error: null }));
        }
    }, [deletedSetupKey])

    const revokeKey = 'creating';
    useEffect(() => {
        if (revokedSetupKey.loading) {
            message.loading({ content: 'Creating...', key: revokeKey, duration: 0, style: styleNotification });
        } else if (revokedSetupKey.success) {
            message.success({ content: 'Key was revoked with success!', key: revokeKey, duration: 2, style: styleNotification });
            dispatch(setupKeyActions.setRevokeSetupKey({ ...revokedSetupKey, success: false }));
        } else if (revokedSetupKey.error) {
            message.error({ content: 'Error! Something wrong to revoke key.', key: revokeKey, duration: 2, style: styleNotification  });
            dispatch(setupKeyActions.setRevokeSetupKey({ ...revokedSetupKey, error: null }));
        }
    }, [revokedSetupKey])

    const createKey = 'creating';
    useEffect(() => {
        if (createdSetupKey.loading) {
            message.loading({ content: 'Creating...', key: createKey, duration: 0, style: styleNotification });
        } else if (createdSetupKey.success) {
            message.success({ content: 'Key created with success!', key: createKey, duration: 2, style: styleNotification });
            dispatch(setupKeyActions.setSetupNewKeyVisible(false));
            dispatch(setupKeyActions.setCreateSetupKey({ ...createdSetupKey, success: false }));
        } else if (createdSetupKey.error) {
            message.error({ content: 'Error! Something wrong to create key.', key: createKey, duration: 2, style: styleNotification  });
            dispatch(setupKeyActions.setCreateSetupKey({ ...createdSetupKey, error: null }));
        }
    }, [createdSetupKey])

    const filterDataTable = ():SetupKey[] => {
        const t = textToSearch.toLowerCase().trim()
        let f:SetupKey[] = [...setupKeys]
        if (optionValidAll === "valid") {
            f = filter(setupKeys, (_f:SetupKey) => _f.Valid && !_f.Revoked)
        }
        f = filter(f, (_f:SetupKey) =>
            (_f.Name.toLowerCase().includes(t) || _f.State.includes(t) || _f.Type.includes(t) || _f.Key.includes(t) || t === "")
        ) as SetupKey[]
        return f
    }

    const onChangeTextToSearch = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTextToSearch(e.target.value)
    };

    const searchDataTable = () => {
        const data = filterDataTable()
        setDataTable(transformDataTable(data))
    }

    const onChangeValidAll = ({ target: { value } }: RadioChangeEvent) => {
        setOptionValidAll(value)
    }

    const onChangePageSize = (value: string) => {
        setPageSize(parseInt(value.toString()))
    }

    const showConfirmDelete = () => {
        confirm({
            icon: <ExclamationCircleOutlined />,
            width: 600,
            content: <Space direction="vertical" size="small">
                {setupKeyToAction &&
                    <>
                        <Title level={5}>Delete setupKey "{setupKeyToAction ? setupKeyToAction.Name : ''}"</Title>
                        <Paragraph>Are you sure you want to delete key?</Paragraph>
                    </>
                }
            </Space>,
            okType: 'danger',
            onOk() {
                dispatch(setupKeyActions.deleteSetupKey.request({getAccessTokenSilently, payload: setupKeyToAction ? setupKeyToAction.Id : ''}));
            },
            onCancel() {
                setSetupKeyToAction(null);
            },
        });
    }

    const showConfirmRevoke = () => {
        confirm({
            icon: <ExclamationCircleOutlined />,
            width: 600,
            content: <Space direction="vertical" size="small">
                {setupKeyToAction &&
                    <>
                        <Title level={5}>Revoke setupKey "{setupKeyToAction ? setupKeyToAction.Name : ''}"</Title>
                        <Paragraph>Are you sure you want to revoke key?</Paragraph>
                    </>
                }
            </Space>,
            okType: 'danger',
            onOk() {
                dispatch(setupKeyActions.revokeSetupKey.request({getAccessTokenSilently, payload: { Id: setupKeyToAction ? setupKeyToAction.Id : null, Revoked: true } as SetupKeyRevoke}));
            },
            onCancel() {
                setSetupKeyToAction(null);
            },
        });
    }

    const onClickAddNewSetupKey = () => {
        dispatch(setupKeyActions.setSetupNewKeyVisible(true));
        dispatch(setupKeyActions.setSetupKey({
            Name: '',
            Type: 'reusable'
        } as SetupKey))
    }

    return (
        <>
            <Container style={{paddingTop: "40px"}}>
                <Row>
                    <Col span={24}>
                        <Title level={4}>Setup Keys</Title>
                        <Paragraph>A list of all the setup keys in your account including their name, state, type and expiration.</Paragraph>
                        <Space direction="vertical" size="large" style={{ display: 'flex' }}>
                            <Row gutter={[16, 24]}>
                                <Col xs={24} sm={24} md={8} lg={8} xl={8} xxl={8} span={8}>
                                    {/*<Input.Search allowClear value={textToSearch} onPressEnter={searchDataTable} onSearch={searchDataTable} placeholder="Search..." onChange={onChangeTextToSearch} />*/}
                                    <Input allowClear value={textToSearch} onPressEnter={searchDataTable} placeholder="Search..." onChange={onChangeTextToSearch} />
                                </Col>
                                <Col xs={24} sm={24} md={11} lg={11} xl={11} xxl={11} span={11}>
                                    <Space size="middle">
                                        <Radio.Group
                                            options={optionsValidAll}
                                            onChange={onChangeValidAll}
                                            value={optionValidAll}
                                            optionType="button"
                                            buttonStyle="solid"
                                        />
                                        <Select value={pageSize.toString()} options={pageSizeOptions} onChange={onChangePageSize} className="select-rows-per-page-en"/>
                                    </Space>
                                </Col>
                                <Col xs={24}
                                     sm={24}
                                     md={5}
                                     lg={5}
                                     xl={5}
                                     xxl={5} span={5}>
                                    <Row justify="end">
                                        <Col>
                                            <Button type="primary" onClick={onClickAddNewSetupKey}>Add Key</Button>
                                        </Col>
                                    </Row>
                                </Col>
                            </Row>
                            {failed &&
                                <Alert message={failed.code} description={failed.message} type="error" showIcon closable/>
                            }
                            {loading && <Loading/>}
                            <Card bodyStyle={{padding: 0}}>
                                <Table
                                    pagination={{pageSize, showSizeChanger: false, showTotal: ((total, range) => `Showing ${range[0]} to ${range[1]} of ${total} setup keys`)}}
                                    className="card-table"
                                    showSorterTooltip={false}
                                    scroll={{x: true}}
                                    dataSource={dataTable}>
                                    <Column title="Name" dataIndex="Name"
                                            onFilter={(value: string | number | boolean, record) => (record as any).Name.includes(value)}
                                            sorter={(a, b) => ((a as any).Name.localeCompare((b as any).Name))}
                                    />

                                    <Column title="State" dataIndex="State"
                                            render={(text, record, index) => {
                                                return (text === 'valid') ? <Tag color="green">{text}</Tag> : <Tag color="red">{text}</Tag>
                                            }}
                                            sorter={(a, b) => ((a as any).State.localeCompare((b as any).State))}
                                    />

                                    <Column title="Type" dataIndex="Type"
                                            onFilter={(value: string | number | boolean, record) => (record as any).Type.includes(value)}
                                            sorter={(a, b) => ((a as any).Type.localeCompare((b as any).Type))}
                                    />

                                    <Column title="Key" dataIndex="Key"
                                            onFilter={(value: string | number | boolean, record) => (record as any).Key.includes(value)}
                                            sorter={(a, b) => ((a as any).Key.localeCompare((b as any).Key))}
                                            render={(text, record, index) => {
                                                return <ButtonCopyMessage keyMessage={(record as SetupKeyDataTable).key} text={text} messageText={`Key copied!`} styleNotification={{}}/>
                                            }}
                                    />

                                    <Column title="Last Used" dataIndex="LastUsed"
                                            render={(text, record, index) => {
                                                return !(record as SetupKey).UsedTimes ? 'unused' : timeAgo(text)
                                            }}
                                    />
                                    <Column title="Used Times" dataIndex="UsedTimes"
                                            sorter={(a, b) => ((a as any).Type.localeCompare((b as any).Type))}
                                    />

                                    <Column title="Expires" dataIndex="Expires"
                                            render={(text, record, index) => {
                                                return formatDate(text)
                                            }}
                                    />

                                    <Column title="" align="center"
                                            render={(text, record, index) => {
                                                return !(record as SetupKeyDataTable).Revoked ? (
                                                    <Dropdown.Button type="text" overlay={actionsMenu} trigger={["click"]}
                                                                        onVisibleChange={visible => {
                                                                            if (visible) setSetupKeyToAction(record as SetupKeyDataTable)
                                                                        }}></Dropdown.Button>) : <></>
                                            }}
                                    />
                                </Table>
                            </Card>
                        </Space>
                    </Col>
                </Row>

            </Container>
            <SetupKeyNew/>
        </>
    )
}

export default withAuthenticationRequired(SetupKeys,
    {
        onRedirecting: () => <Loading padding="3em" width="50px" height="50px"/>,
    }
);