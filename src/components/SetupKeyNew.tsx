import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { actions as setupKeyActions } from "../store/setup-key";
import { Button, Col, Divider, Form, Input, InputNumber, Modal, Row, Select, Switch, Tag, Typography } from "antd";
import { RootState } from "typesafe-actions";
import { FormSetupKey, SetupKey, SetupKeyToSave } from "../store/setup-key/types";
import { formatDate, timeAgo } from "../utils/common";
import { RuleObject } from "antd/lib/form";
import { CustomTagProps } from "rc-select/lib/BaseSelect";
import { Group } from "../store/group/types";
import { useGetTokenSilently } from "../utils/token";
import { expiresInToSeconds, ExpiresInValue } from "../views/ExpiresInInput";
import moment from "moment";
import { Container } from "./Container";
import Paragraph from "antd/es/typography/Paragraph";
import { EditOutlined, LockOutlined } from "@ant-design/icons";

const { Option } = Select;
const { Text } = Typography;
const ExpiresInDefault: ExpiresInValue = { number: 30, interval: "day" };

const customExpiresFormat = (value: Date): string | null => {
    return formatDate(value);
};

const customLastUsedFormat = (value: Date): string | null => {
    if (value.getFullYear() === 1) {
        // 1st of Jan 0001
        return "never";
    }

    let ago = timeAgo(value.toString());
    if (!ago) return "unused";

    return ago;
};

const SetupKeyNew = () => {
    const { getTokenSilently } = useGetTokenSilently();
    const dispatch = useDispatch();
    const setupNewKeyVisible = useSelector((state: RootState) => state.setupKey.setupNewKeyVisible);
    const setupKey = useSelector((state: RootState) => state.setupKey.setupKey);
    const savedSetupKey = useSelector((state: RootState) => state.setupKey.savedSetupKey);
    const groups = useSelector((state: RootState) => state.group.data);

    const [form] = Form.useForm();
    const [editName, setEditName] = useState(false);
    const [tagGroups, setTagGroups] = useState([] as string[]);
    const [formSetupKey, setFormSetupKey] = useState({} as FormSetupKey);
    const inputNameRef = useRef<any>(null);
    const isEditMode: boolean = !!formSetupKey.id;

    useEffect(() => {
        if (!editName) return;

        inputNameRef.current!.focus({ cursor: "end" });
    }, [editName]);

    useEffect(() => {
        setTagGroups(groups?.filter((g) => g.name !== "All").map((g) => g.name) || []);
    }, [groups]);

    useEffect(() => {
        if (!setupKey) return;

        const allGroups = new Map<string, Group>();
        let formKeyGroups: string[] = [];
        groups.forEach((g) => allGroups.set(g.id!, g));

        if (setupKey.auto_groups) {
            formKeyGroups = setupKey.auto_groups.filter((g) => allGroups.get(g)).map((g) => allGroups.get(g)!.name);
        }

        const fSetupKey = {
            ...setupKey,
            autoGroupNames: setupKey.auto_groups ? formKeyGroups : [],
            expiresInFormatted: ExpiresInDefault,
            exp: moment(setupKey.expires),
            last: moment(setupKey.last_used),
        } as FormSetupKey;

        form.setFieldsValue(fSetupKey);
        setFormSetupKey(fSetupKey);
    }, [setupKey]);

    const createSetupKeyToSave = (): SetupKeyToSave => {
        const autoGroups =
            groups?.filter((g) => formSetupKey.autoGroupNames.includes(g.name)).map((g) => g.id || "") || [];
        // find groups that do not yet exist (newly added by the user)
        const allGroupsNames: string[] = groups?.map((g) => g.name);
        const groupsToCreate = formSetupKey.autoGroupNames.filter((s) => !allGroupsNames.includes(s));

        const expiresIn = expiresInToSeconds(formSetupKey.expiresInFormatted);
        return {
            id: formSetupKey.id,
            name: formSetupKey.name,
            type: formSetupKey.type,
            auto_groups: autoGroups,
            revoked: formSetupKey.revoked,
            groupsToCreate: groupsToCreate,
            expires_in: expiresIn,
            usage_limit: formSetupKey.usage_limit,
        } as SetupKeyToSave;
    };

    const handleFormSubmit = async () => {
        try {
            await form.validateFields();
        } catch (e) {
            const errorFields = (e as any).errorFields;
            return console.log("errorInfo", errorFields);
        }

        const setupKeyToSave = createSetupKeyToSave();
        dispatch(
            setupKeyActions.saveSetupKey.request({
                getAccessTokenSilently: getTokenSilently,
                payload: setupKeyToSave,
            })
        );
    };

    const setVisibleNewSetupKey = (status: boolean) => {
        form.resetFields();
        dispatch(setupKeyActions.setSetupNewKeyVisible(status));
    };

    const onCancel = () => {
        if (savedSetupKey.loading) return;

        dispatch(
            setupKeyActions.setSetupKey({
                name: "",
                type: "one-off",
                key: "",
                last_used: "",
                expires: "",
                state: "valid",
                auto_groups: [] as string[],
                usage_limit: 0,
                used_times: 0,
                expires_in: 0,
            } as SetupKey)
        );
        setFormSetupKey({} as FormSetupKey);
        setVisibleNewSetupKey(false);
    };

    const onChange = (data: any) => {
        setFormSetupKey({ ...formSetupKey, ...data });
    };

    const toggleEditName = (status: boolean) => {
        setEditName(status);
    };

    const selectValidator = (_: RuleObject, value: string[]) => {
        let hasSpaceNamed = [];

        value.forEach(function (v: string) {
            if (!v.trim().length) {
                hasSpaceNamed.push(v);
            }
        });

        if (hasSpaceNamed.length) {
            return Promise.reject(new Error("Group names with just spaces are not allowed"));
        }

        return Promise.resolve();
    };

    const tagRender = (props: CustomTagProps) => {
        const { value, closable, onClose } = props;
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
    };

    const optionRender = (label: string) => {
        let peersCount = "";
        const g = groups.find((_g) => _g.name === label);

        if (g) {
            peersCount = ` - ${g.peers_count || 0} ${
                !g.peers_count || parseInt(g.peers_count) !== 1 ? "peers" : "peer"
            } `;
        }

        return (
            <>
                <Tag color="blue" style={{ marginRight: 3 }}>
                    <strong>{label}</strong>
                </Tag>
                <span style={{ fontSize: ".85em" }}>{peersCount}</span>
            </>
        );
    };

    const dropDownRender = (menu: React.ReactElement) => (
        <>
            {menu}
            <Divider style={{ margin: "8px 0" }} />
            <Row style={{ padding: "0 8px 4px" }}>
                <Col flex="auto">
                    <span style={{ color: "#9CA3AF" }}>Add new group by pressing "Enter"</span>
                </Col>
                <Col flex="none">
                    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M1.70455 7.19176V5.89915H10.3949C10.7727 5.89915 11.1174 5.80634 11.429 5.62074C11.7405 5.43513 11.9875 5.18655 12.1697 4.875C12.3554 4.56345 12.4482 4.21875 12.4482 3.84091C12.4482 3.46307 12.3554 3.12003 12.1697 2.81179C11.9841 2.50024 11.7356 2.25166 11.424 2.06605C11.1158 1.88044 10.7727 1.78764 10.3949 1.78764H9.83807V0.5H10.3949C11.0114 0.5 11.5715 0.650805 12.0753 0.952414C12.5791 1.25402 12.9818 1.65672 13.2834 2.16051C13.585 2.6643 13.7358 3.22443 13.7358 3.84091C13.7358 4.30161 13.648 4.73414 13.4723 5.13849C13.3 5.54285 13.0613 5.89915 12.7564 6.20739C12.4515 6.51562 12.0968 6.75758 11.6925 6.93324C11.2881 7.10559 10.8556 7.19176 10.3949 7.19176H1.70455ZM4.90128 11.0646L0.382102 6.54545L4.90128 2.02628L5.79119 2.91619L2.15696 6.54545L5.79119 10.1747L4.90128 11.0646Z"
                            fill="#9CA3AF"
                        />
                    </svg>
                </Col>
            </Row>
        </>
    );

    const changesDetected = (): boolean => {
        return (
            formSetupKey.name == null ||
            formSetupKey.name !== setupKey.name ||
            groupsChanged() ||
            formSetupKey.usage_limit !== setupKey.usage_limit
        );
    };

    const groupsChanged = (): boolean => {
        if (setupKey && setupKey.auto_groups && formSetupKey.autoGroupNames.length !== setupKey.auto_groups.length) {
            return true;
        }
        const formGroupIds =
            groups?.filter((g) => formSetupKey.autoGroupNames.includes(g.name)).map((g) => g.id || "") || [];

        return setupKey.auto_groups?.filter((g) => !formGroupIds.includes(g)).length > 0;
    };

    return (
        <Modal
            style={{
                ...{ maxWidth: window.screen.availWidth <= 425 ? "90%" : "414px" },
            }}
            open={setupNewKeyVisible}
            onCancel={onCancel}
            title={
                <Paragraph
                    style={{
                        whiteSpace: "pre-line",
                        fontSize: "18px",
                        fontWeight: "600",
                        lineHeight: "26px",
                        color: "#252526",
                    }}
                >
                    {isEditMode ? "Setup Key overview" : "Create Setup Key"}
                </Paragraph>
            }
            footer={[
                <Container
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "end",
                        padding: 0,
                    }}
                    key={0}
                >
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button
                        type="primary"
                        style={{
                            height: "100%",
                            fontSize: "14px",
                            borderRadius: "2px",
                        }}
                        disabled={savedSetupKey.loading || !changesDetected()}
                        onClick={handleFormSubmit}
                    >
                        {`${formSetupKey.id ? "Save" : "Create"} Key`}
                    </Button>
                </Container>,
            ]}
        >
            <Form
                layout="vertical"
                hideRequiredMark
                form={form}
                onValuesChange={onChange}
                initialValues={{
                    expiresIn: ExpiresInDefault,
                    usage_limit: 1,
                }}
            >
                <Container
                    style={{
                        padding: 0,
                    }}
                >
                    <Row style={{ marginTop: "28px" }}>
                        {isEditMode ? (
                            <></>
                        ) : (
                            <Col span={24}>
                                <Paragraph
                                    style={{ whiteSpace: "pre-line", fontSize: "16px", fontWeight: "600", margin: 0 }}
                                >
                                    Key name
                                </Paragraph>
                                <Text style={{ color: "#818183" }}>Name the key to identify it easily</Text>
                            </Col>
                        )}

                        <Col span={24}>
                            <Form.Item
                                style={{ marginBottom: "0px" }}
                                name="name"
                                rules={[{ required: true, message: "Please enter key name." }]}
                            >
                                {isEditMode ? (
                                    <Input
                                        key={"edit-name-input"}
                                        readOnly={!editName}
                                        placeholder={setupKey.name}
                                        autoComplete="off"
                                        ref={inputNameRef}
                                        suffix={<EditOutlined onClick={() => toggleEditName(true)} />}
                                        onPressEnter={() => toggleEditName(false)}
                                        onBlur={() => toggleEditName(false)}
                                    />
                                ) : (
                                    <Input placeholder={`e.g. "AWS servers"`} />
                                )}
                            </Form.Item>
                        </Col>
                    </Row>

                    {isEditMode && (
                        <Row style={{ marginTop: "28px" }}>
                            <Col span={24}>
                                <Paragraph
                                    style={{ whiteSpace: "pre-line", fontSize: "16px", fontWeight: "600", margin: 0 }}
                                >
                                    Key
                                    <Tag
                                        color={`${formSetupKey.state === "valid" ? "green" : "red"}`}
                                        style={{ marginLeft: "10px", borderRadius: "2px", fontWeight: "500" }}
                                    >
                                        {formSetupKey.state}
                                    </Tag>
                                </Paragraph>
                                <Input
                                    style={{ marginTop: "10px" }}
                                    disabled
                                    value={formSetupKey.key}
                                    suffix={<LockOutlined style={{ color: "#BFBFBF" }} />}
                                />
                            </Col>
                        </Row>
                    )}

                    <Row style={{ marginTop: "28px" }}>
                        {isEditMode ? (
                            <Row style={{ fontSize: "16px" }}>
                                <Paragraph style={{ whiteSpace: "pre-line", margin: 0, fontWeight: "600" }}>
                                    {formSetupKey.type === "one-off" ? "One-off" : "Reusable"}
                                </Paragraph>
                                <Text style={{ marginLeft: "5px", color: "#818183" }}>type</Text>
                            </Row>
                        ) : (
                            <Row>
                                <Col style={{ width: "80%" }}>
                                    <Paragraph
                                        style={{
                                            whiteSpace: "pre-line",
                                            fontSize: "16px",
                                            margin: 0,
                                            fontWeight: "600",
                                        }}
                                    >
                                        Reusable
                                    </Paragraph>
                                    <Text style={{ color: "#818183" }}>
                                        This type of a setup key allows to enroll multiple peers
                                    </Text>
                                </Col>
                                <Form.Item
                                    name="reusable"
                                    valuePropName="checked"
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "end",
                                        flexGrow: 1,
                                    }}
                                >
                                    <Switch
                                        onChange={(checked) => {
                                            setFormSetupKey({
                                                ...formSetupKey,
                                                type: checked ? "reusable" : "one-off",
                                            });
                                        }}
                                    />
                                </Form.Item>
                            </Row>
                        )}
                    </Row>

                    <Row style={{ marginTop: "28px" }}>
                        <Col span={24}>
                            <Paragraph
                                style={{ whiteSpace: "pre-line", fontSize: "16px", margin: 0, fontWeight: "600" }}
                            >
                                {isEditMode ? "Available uses" : "Usage limit"}
                            </Paragraph>
                        </Col>
                        <Col>
                            {isEditMode ? (
                                <Input
                                    disabled
                                    value={formSetupKey.usage_limit}
                                    suffix={<LockOutlined style={{ color: "#BFBFBF" }} />}
                                    style={{ width: "104px" }}
                                />
                            ) : (
                                <Form.Item
                                    style={{ marginTop: "5px", width: "112px", marginBottom: "5px" }}
                                    name="usage_limit"
                                >
                                    <InputNumber
                                        disabled={setupKey.id || formSetupKey.type !== "reusable"}
                                        controls={false}
                                        min={0}
                                    />
                                </Form.Item>
                            )}
                        </Col>
                        {isEditMode ? (
                            <></>
                        ) : (
                            <Col span={24}>
                                <Text style={{ color: "#818183" }}>
                                    1 usage = 1 peer. E.g., set to 30 if you want to enroll 30 peers
                                </Text>
                            </Col>
                        )}
                    </Row>

                    <Row style={{ marginTop: "20px" }}>
                        {isEditMode ? (
                            <Container style={{ width: "100%", padding: 0, margin: 0 }}>
                                <Row>
                                    <Col span={11}>
                                        <Paragraph style={{ fontSize: "16px", margin: 0, fontWeight: "600" }}>
                                            Expires
                                        </Paragraph>
                                        <Row>
                                            <Input
                                                disabled
                                                suffix={<LockOutlined style={{ color: "#BFBFBF" }} />}
                                                value={customExpiresFormat(new Date(formSetupKey.expires))!}
                                            />
                                        </Row>
                                    </Col>
                                    <Col span={11} offset={1}>
                                        <Paragraph style={{ fontSize: "16px", margin: 0, fontWeight: "600" }}>
                                            Last used
                                        </Paragraph>
                                        <Row>
                                            <Input
                                                disabled
                                                suffix={<LockOutlined style={{ color: "#BFBFBF" }} />}
                                                value={customLastUsedFormat(new Date(formSetupKey.last_used))!}
                                            />
                                        </Row>
                                    </Col>
                                </Row>
                            </Container>
                        ) : (
                            <>
                                <Col span={24}>
                                    <Paragraph
                                        style={{
                                            whiteSpace: "pre-line",
                                            fontSize: "16px",
                                            margin: 0,
                                            fontWeight: "600",
                                        }}
                                    >
                                        Expires in
                                    </Paragraph>
                                </Col>
                                <Col>
                                    <Form.Item
                                        style={{
                                            marginTop: "5px",
                                            width: "112px",
                                            marginBottom: "0px",
                                        }}
                                        name="expiresIn"
                                        rules={[{ required: true, message: "Please enter expiration date." }]}
                                    >
                                        <Col
                                            style={{
                                                display: "flex",
                                                flexDirection: "row",
                                            }}
                                        >
                                            <InputNumber
                                                type="number"
                                                controls={false}
                                                placeholder={`0`}
                                                min={0}
                                                max={180}
                                            />
                                            <Col
                                                style={{
                                                    marginLeft: "7px",
                                                    padding: "4px 12px",
                                                    border: "1px solid #D9D9D9",
                                                    borderRadius: "2px",
                                                }}
                                            >
                                                Days
                                            </Col>
                                        </Col>
                                    </Form.Item>
                                </Col>

                                <Col span={24} style={{ marginTop: "5px" }}>
                                    <Text style={{ color: "#818183" }}>Should be between 1 and 180 days</Text>
                                </Col>
                            </>
                        )}
                    </Row>

                    <Row style={{ marginTop: "20px" }}>
                        <Col span={24}>
                            <Paragraph
                                style={{ whiteSpace: "pre-line", fontSize: "16px", margin: 0, fontWeight: "600" }}
                            >
                                Auto-assigned groups
                            </Paragraph>
                            {isEditMode ? (
                                <></>
                            ) : (
                                <Text style={{ color: "#818183" }}>
                                    These groups will be automatically assigned to peers enrolled with this key
                                </Text>
                            )}
                        </Col>
                        <Col span={24}>
                            <Form.Item
                                style={{ marginTop: "5px", marginBottom: 0 }}
                                name="autoGroupNames"
                                rules={[{ validator: selectValidator }]}
                            >
                                <Select
                                    mode="tags"
                                    style={{ width: "100%" }}
                                    placeholder="Associate groups with the key"
                                    tagRender={tagRender}
                                    dropdownRender={dropDownRender}
                                    // enabled only when we have a new key !setupkey.id or when the key is valid
                                    disabled={!(!setupKey.id || setupKey.valid)}
                                >
                                    {tagGroups.map((m) => (
                                        <Option key={m}>{optionRender(m)}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row style={{ marginTop: "40px", marginBottom: "28px" }}>
                        <Text style={{ color: "#818183" }}>
                            Learn more about
                            <a target="_blank" rel="noreferrer" href="https://netbird.io/docs/overview/setup-keys">
                                {" "}
                                Setup Keys
                            </a>
                        </Text>
                    </Row>
                </Container>
            </Form>
        </Modal>
    );
};

export default SetupKeyNew;
