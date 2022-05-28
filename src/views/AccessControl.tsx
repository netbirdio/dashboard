import React, {useEffect, useState} from 'react';
import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import {
    Button,
    Col, Menu, message, Modal, RadioChangeEvent,
    Row, Space, Table,
    Typography
} from "antd";
import {Container} from "../components/Container";
import Loading from "../components/Loading";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {Rule} from "../store/rule/types";
import {actions as ruleActions} from "../store/rule";
import {filter} from "lodash";
import {ExclamationCircleOutlined} from "@ant-design/icons";

const { Title, Paragraph } = Typography;
const { Column } = Table;
const { confirm } = Modal;

interface RuleDataTable extends Rule {
    key: string
}

export const AccessControl = () => {
    const { getAccessTokenSilently } = useAuth0()
    const dispatch = useDispatch()

    const rules = useSelector((state: RootState) => state.rule.data);
    const failed = useSelector((state: RootState) => state.rule.failed);
    const loading = useSelector((state: RootState) => state.rule.loading);
    const deletedRule = useSelector((state: RootState) => state.rule.deletedRule);

    const [textToSearch, setTextToSearch] = useState('');
    const [optionAllEnable, setOptionAllEnable] = useState('all');
    const [pageSize, setPageSize] = useState(5);
    const [dataTable, setDataTable] = useState([] as RuleDataTable[]);
    const [ruleToAction, setRuleToAction] = useState(null as RuleDataTable | null);

    const pageSizeOptions = [
        {label: "5", value: "5"},
        {label: "10", value: "10"},
        {label: "15", value: "15"}
    ]

    const optionsAllEnabled = [{label: 'All', value: 'all'}, {label: 'Enabled', value: 'enabled'}]

    const itemsMenuAction = [
        {
            key: "delete",
            label: (<Button type="text" onClick={() => showConfirmDelete()}>Delete</Button>)
        }
    ]
    const actionsMenu = (<Menu items={itemsMenuAction} ></Menu>)

    const transformDataTable = (d:Rule[]):RuleDataTable[] => {
        return d.map(p => ({ key: p.ID, ...p } as RuleDataTable))
    }

    useEffect(() => {
        //dispatch(ruleActions.getRules.request({getAccessTokenSilently, payload: null}));
    }, [])

    useEffect(() => {
        setDataTable(transformDataTable(rules))
    }, [rules])

    useEffect(() => {
        setDataTable(transformDataTable(filterDataTable()))
    }, [textToSearch, optionAllEnable])

    const deleteKey = 'deleting';
    useEffect(() => {
        const style = { marginTop: 85 }
        if (deletedRule.loading) {
            message.loading({ content: 'Deleting...', key: deleteKey, style });
        } else if (deletedRule.success) {
            message.success({ content: 'Rule deleted with success!', key: deleteKey, duration: 2, style });
        } else if (deletedRule.error) {
            message.error({ content: 'Error! Something wrong to delete rule.', key: deleteKey, duration: 2, style  });
        }
    }, [deletedRule])

    const onChangeTextToSearch = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTextToSearch(e.target.value)
    };

    const searchDataTable = () => {
        const data = filterDataTable()
        setDataTable(transformDataTable(data))
    }

    const onChangeOnOff = ({ target: { value } }: RadioChangeEvent) => {
        setOptionAllEnable(value)
    }

    const onChangePageSize = (value: string) => {
        setPageSize(parseInt(value.toString()))
    }

    const showConfirmDelete = () => {
        confirm({
            icon: <ExclamationCircleOutlined />,
            width: 600,
            content: <Space direction="vertical" size="small">
                {ruleToAction &&
                    <>
                        <Title level={5}>Delete rule "{ruleToAction ? ruleToAction.Name : ''}"</Title>
                        <Paragraph>Are you sure you want to delete peer from your account?</Paragraph>
                    </>
                }
            </Space>,
            okType: 'danger',
            onOk() {
                dispatch(ruleActions.deletedRule.request({getAccessTokenSilently, payload: ruleToAction?.ID || ''}));
            },
            onCancel() {
                setRuleToAction(null);
            },
        });
    }

    const filterDataTable = ():Rule[] => {
        const t = textToSearch.toLowerCase().trim()
        let f:Rule[] = filter(rules, (f:Rule) =>
            (f.Name.toLowerCase().includes(t) || t === "")
        ) as Rule[]
        // if (optionAllEnabled === "enabled") {
        //     f = filter(rules, (f:Rule) => f.)
        // }
        return f
    }

    return(
        <Container style={{paddingTop: "40px"}}>
            <Row>
                <Col span={24}>
                    <Title level={4}>Access Control</Title>
                    <Title level={5}>Create and control access groups</Title>
                    <Paragraph>
                        Here you will be able to specify what peers or groups of peers are able to connect to each other.
                        For example, you might have 3 departments in your organization - IT, HR, Finance.
                        In most cases Finance and HR departments wouldn't need to access machines of the IT department.
                        In such scenario you could create 3 separate tags (groups) and label peers accordingly so that only peers from the same group can access each other.
                        You could also specify what groups can connect to each other and do fine grained control even on a peer level.
                    </Paragraph>
                    <Paragraph>
                        Stay tuned.
                    </Paragraph>
                </Col>
            </Row>
        </Container>
    )
}

export default withAuthenticationRequired(AccessControl,
    {
        onRedirecting: () => <Loading/>,
    }
);