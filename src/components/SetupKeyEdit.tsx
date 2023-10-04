import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { actions as setupKeyActions } from "../store/setup-key";
import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Select,
  Breadcrumb,
  Tag,
  Typography,
  Card,
  Tooltip,
} from "antd";
import { RootState } from "typesafe-actions";
import {
  FormSetupKey,
  SetupKey,
  SetupKeyToSave,
} from "../store/setup-key/types";
import { formatDate } from "../utils/common";
import { RuleObject } from "antd/lib/form";
import { Group } from "../store/group/types";
import { useGetTokenSilently } from "../utils/token";
import moment from "moment";
import { Container } from "./Container";
import Paragraph from "antd/es/typography/Paragraph";
import { LockOutlined } from "@ant-design/icons";
import { actions as personalAccessTokenActions } from "../store/personal-access-token";
import { useGetGroupTagHelpers } from "../utils/groups";

const { Option } = Select;
const { Text } = Typography;

const customExpiresFormat = (value: Date): string | null => {
  return formatDate(value);
};

const SetupKeyNew = (props: any) => {
  const { isGroupUpdateView, setShowGroupModal } = props;
  const {
    optionRender,
    blueTagRender,
    tagGroups,
    getExistingAndToCreateGroupsLists,
    setGroupTagFilterAll,
  } = useGetGroupTagHelpers();
  const { getTokenSilently } = useGetTokenSilently();
  const dispatch = useDispatch();

  const setupKey = useSelector((state: RootState) => state.setupKey.setupKey);
  const savedSetupKey = useSelector(
    (state: RootState) => state.setupKey.savedSetupKey
  );
 
  const groups = useSelector((state: RootState) => state.group.data);

  const [form] = Form.useForm();
  const [editName, setEditName] = useState(false);
  const [formSetupKey, setFormSetupKey] = useState({} as FormSetupKey);
  const inputNameRef = useRef<any>(null);

  useEffect(() => {
    setGroupTagFilterAll(true);
  }, []);

  useEffect(() => {
    //Unmounting component clean
    return () => {
      setVisibleNewSetupKey(false);
    };
  }, []);

  useEffect(() => {
    if (!editName) return;

    inputNameRef.current!.focus({ cursor: "end" });
  }, [editName]);

  useEffect(() => {
    if (!setupKey) return;

    const allGroups = new Map<string, Group>();
    let formKeyGroups: string[] = [];
    groups.forEach((g) => allGroups.set(g.id!, g));

    if (setupKey.auto_groups) {
      formKeyGroups = setupKey.auto_groups
        .filter((g) => allGroups.get(g))
        .map((g) => allGroups.get(g)!.name);
    }
    const fSetupKey = {
      ...setupKey,
      autoGroupNames: setupKey.auto_groups || [],
      exp: moment(setupKey.expires),
      last: moment(setupKey.last_used),
    } as FormSetupKey;
     form.setFieldsValue(fSetupKey);
    setFormSetupKey(fSetupKey);
  }, [setupKey]);

  const createSetupKeyToSave = (): SetupKeyToSave => {
    let [existingGroups, groupsToCreate] = getExistingAndToCreateGroupsLists(
      formSetupKey.autoGroupNames
    );

    const expiresIn = formSetupKey.expires_in * 24 * 3600; // the api expects seconds while the form returns days
    return {
      id: formSetupKey.id,
      name: formSetupKey.name,
      type: formSetupKey.type,
      auto_groups: existingGroups,
      revoked: formSetupKey.revoked,
      groupsToCreate: groupsToCreate,
      expires_in: expiresIn,
      usage_limit: formSetupKey.usage_limit,
      ephemeral: formSetupKey.ephemeral,
    } as SetupKeyToSave;
  };

  const handleFormSubmit = async () => {
    try {
      await form.validateFields();
    } catch (e) {
      const errorFields = (e as any).errorFields;
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
    dispatch(setupKeyActions.setSetupEditKeyVisible(status));
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
    if (setShowGroupModal) {
      setShowGroupModal(false);
    }
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
      return Promise.reject(
        new Error("Group names with just spaces are not allowed")
      );
    }

    return Promise.resolve();
  };

  const dropDownRender = (menu: React.ReactElement) => (
    <>
      {menu}
      <Divider style={{ margin: "8px 0" }} />
      <Row style={{ padding: "0 8px 4px" }}>
        <Col flex="auto">
          <span style={{ color: "#9CA3AF" }}>
            Add new group by pressing "Enter"
          </span>
        </Col>
        <Col flex="none">
          <svg
            width="14"
            height="12"
            viewBox="0 0 14 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
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
    if (
      setupKey &&
      setupKey.auto_groups &&
      formSetupKey.autoGroupNames.length !== setupKey.auto_groups.length
    ) {
      return true;
    }
    const formGroupIds =
      groups
        ?.filter((g) => formSetupKey.autoGroupNames.includes(g.name))
        .map((g) => g.id || "") || [];

    return (
      setupKey.auto_groups?.filter((g) => !formGroupIds.includes(g)).length > 0
    );
  };

  const getFormKey = (key: string) => {
    if (key) return key.substring(0, 4).concat("****");
  };

  const onBreadcrumbUsersClick = () => {
    if (savedSetupKey.loading) return;
    // dispatch(userActions.setUser(null as unknown as User));
    dispatch(personalAccessTokenActions.resetPersonalAccessTokens(null));
    setVisibleNewSetupKey(false);
  };
   return (
    <>
      {!isGroupUpdateView && (
        <Breadcrumb
          style={{ marginBottom: "25px" }}
          items={[
            {
              title: <a onClick={onBreadcrumbUsersClick}>Setup Keys</a>,
            },
            {
              title: setupKey.name,
            },
          ]}
        />
      )}
      <Card
        bordered={true}
        className={isGroupUpdateView ? " noborderPadding" : ""}
        style={{ marginBottom: "7px", border: "none" }}
      >
        <div style={{ maxWidth: "800px" }}>
          {!isGroupUpdateView && (
            <h3
              style={{
                fontSize: "22px",
                fontWeight: "500",
                marginBottom: "30px",
              }}
            >
              {setupKey.name}
            </h3>
          )}
          <Form
            layout="vertical"
            requiredMark={false}
            form={form}
            onValuesChange={onChange}
            initialValues={{
              usage_limit: 1,
            }}
          >
            {!isGroupUpdateView && (
              <Row style={{ marginTop: "10px" }}>
                <Col
                  sm={24}
                  md={8}
                  lg={8}
                  style={{
                    paddingRight: "70px",
                  }}
                >
                  <Paragraph
                    style={{
                      whiteSpace: "pre-line",
                      fontWeight: "500",
                      margin: 0,
                    }}
                  >
                    Key
                    <Tag
                      color={`${
                        formSetupKey.state === "valid" ? "green" : "red"
                      }`}
                      style={{
                        marginLeft: "10px",
                        borderRadius: "2px",
                        fontWeight: "500",
                      }}
                    >
                      {formSetupKey.state}
                    </Tag>
                  </Paragraph>
                  <Input
                    style={{ marginTop: "8px" }}
                    disabled
                    value={getFormKey(formSetupKey.key)}
                    suffix={<LockOutlined style={{ color: "#BFBFBF" }} />}
                  />
                </Col>

                <Col
                  sm={24}
                  md={8}
                  lg={6}
                  style={{
                    paddingRight: "70px",
                  }}
                >
                  <Paragraph
                    style={{
                      whiteSpace: "pre-line",
                      margin: 0,
                      fontWeight: "500",
                    }}
                  >
                    <Paragraph
                      style={{
                        whiteSpace: "pre-line",
                        margin: 0,
                        fontWeight: "500",
                      }}
                    ></Paragraph>
                    Type{" "}
                    {formSetupKey.ephemeral ? (
                      <Tooltip title="Peers that are offline for over 10 minutes will be removed automatically">
                        <Tag>
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            ephemeral
                          </Text>
                        </Tag>
                      </Tooltip>
                    ) : (
                      " "
                    )}
                  </Paragraph>
                  <Col>
                    <Input
                      disabled
                      value={
                        formSetupKey.type === "one-off" ? "One-off" : "Reusable"
                      }
                      suffix={<LockOutlined style={{ color: "#BFBFBF" }} />}
                      style={{ marginTop: "8px" }}
                    />
                  </Col>
                </Col>

                <Col sm={24} md={8} lg={3}>
                  <Paragraph
                    style={{
                      whiteSpace: "pre-line",
                      margin: 0,
                      fontWeight: "500",
                    }}
                  >
                    <Paragraph
                      style={{
                        whiteSpace: "pre-line",
                        margin: 0,
                        fontWeight: "500",
                      }}
                    ></Paragraph>
                    {/* {formSetupKey.type === "one-off" ? "One-off" : "Reusable"}, */}
                    Available uses
                  </Paragraph>
                  <Col>
                    <Input
                      disabled
                      value={
                        formSetupKey.type === "reusable" &&
                        formSetupKey.usage_limit === 0
                          ? "unlimited"
                          : formSetupKey.usage_limit - formSetupKey.used_times
                      }
                      suffix={<LockOutlined style={{ color: "#BFBFBF" }} />}
                      style={{ marginTop: "8px" }}
                    />
                  </Col>
                </Col>
              </Row>
            )}
            <Row style={{ marginTop: `${isGroupUpdateView ? "0" : "39px"}` }}>
              {!isGroupUpdateView && (
                <Col xs={24} sm={24} md={5} lg={5} xl={5} xxl={5} span={5}>
                  <Paragraph style={{ margin: 0, fontWeight: "500" }}>
                    Expires
                  </Paragraph>
                  <Row>
                    <Input
                      style={{ marginTop: "8px" }}
                      disabled
                      suffix={<LockOutlined style={{ color: "#BFBFBF" }} />}
                      value={
                        customExpiresFormat(new Date(formSetupKey.expires))!
                      }
                    />
                  </Row>
                </Col>
              )}
            </Row>
            <Row style={{ marginTop: `${isGroupUpdateView ? "0" : "39px"}` }}>
              <Col
                xs={24}
                sm={24}
                md={!isGroupUpdateView ? 11 : 24}
                lg={!isGroupUpdateView ? 11 : 24}
                xl={!isGroupUpdateView ? 11 : 24}
                xxl={!isGroupUpdateView ? 11 : 24}
                span={!isGroupUpdateView ? 11 : 24}
                style={{
                  paddingRight: `${!isGroupUpdateView ? "70px" : "0"}`,
                }}
              >
                <Paragraph
                  style={{
                    whiteSpace: "pre-line",
                    margin: 0,
                    fontWeight: "500",
                  }}
                >
                  Auto-assigned groups
                </Paragraph>

                <Col span={24}>
                  <Form.Item
                    style={{ marginTop: "8px", marginBottom: 0 }}
                    name="autoGroupNames"
                    rules={[{ validator: selectValidator }]}
                  >
                    <Select
                      mode="tags"
                      style={{ width: "100%" }}
                      placeholder="Associate groups with the key"
                      tagRender={blueTagRender}
                      dropdownRender={dropDownRender}
                      optionFilterProp="searchValue"
                    >
                      {tagGroups.map((m, index) => (
                        <Option key={index} value={m.id} serchValue={m.name}>
                          {optionRender(m.name, m.id)}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Col>
            </Row>
          </Form>
        </div>
        <Container
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: `${!isGroupUpdateView ? "start" : "end"}`,
            padding: 0,
            gap: "10px",
            marginTop: "24px",
          }}
          key={0}
        >
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            type="primary"
            disabled={savedSetupKey.loading || !changesDetected()}
            onClick={handleFormSubmit}
          >
            {`${formSetupKey.id ? "Save" : "Create"} key`}
          </Button>
        </Container>
      </Card>
    </>
  );
};

export default SetupKeyNew;
