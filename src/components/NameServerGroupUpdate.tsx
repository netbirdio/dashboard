import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "typesafe-actions";
import { actions as nsGroupActions } from "../store/nameservers";
import {
  Button,
  Col,
  Switch,
  Form,
  FormListFieldData,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Typography,
  Card,
  Breadcrumb,
} from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Header } from "antd/es/layout/layout";
import { RuleObject } from "antd/lib/form";
import cidrRegex from "cidr-regex";
import {
  NameServer,
  NameServerGroup,
  NameServerGroupToSave,
} from "../store/nameservers/types";
import { useGetGroupTagHelpers } from "../utils/groups";
import { useGetTokenSilently } from "../utils/token";
import { Container } from "./Container";

const { Paragraph, Text } = Typography;

interface formNSGroup extends NameServerGroup {}

const NameServerGroupUpdate = () => {
  const {
    blueTagRender,
    handleChangeTags,
    dropDownRender,
    optionRender,
    tagGroups,
    getExistingAndToCreateGroupsLists,
    getGroupNamesFromIDs,
    selectValidator,
  } = useGetGroupTagHelpers();
  const dispatch = useDispatch();
  const { getTokenSilently } = useGetTokenSilently();
  const { Option } = Select;
  const nsGroup = useSelector(
    (state: RootState) => state.nameserverGroup.nameserverGroup
  );
  const setupEditNameServerGroupVisible = useSelector(
    (state: RootState) => state.nameserverGroup.setupEditNameServerGroupVisible
  );
  const savedNSGroup = useSelector(
    (state: RootState) => state.nameserverGroup.savedNameServerGroup
  );
  const nsGroupData = useSelector(
    (state: RootState) => state.nameserverGroup.data
  );

  const [formNSGroup, setFormNSGroup] = useState({} as formNSGroup);
  const [form] = Form.useForm();
  const [editName, setEditName] = useState(false);
  const [isPrimary, setIsPrimary] = useState(false);
  const [editDescription, setEditDescription] = useState(false);
  const inputNameRef = useRef<any>(null);
  const inputDescriptionRef = useRef<any>(null);

  useEffect(() => {
    if (editName)
      inputNameRef.current!.focus({
        cursor: "end",
      });
  }, [editName]);

  useEffect(() => {
    //Unmounting component clean
    return () => {
      onCancel();
    };
  }, []);

  useEffect(() => {
    if (editDescription)
      inputDescriptionRef.current!.focus({
        cursor: "end",
      });
  }, [editDescription]);

  useEffect(() => {
    if (!nsGroup) return;

    let newFormGroup = {
      ...nsGroup,
      groups: getGroupNamesFromIDs(nsGroup.groups),
    } as formNSGroup;
    setFormNSGroup(newFormGroup);
    form.setFieldsValue(newFormGroup);

    if (nsGroup.primary !== undefined) {
      setIsPrimary(nsGroup.primary);
    }
  }, [nsGroup]);

  const onCancel = () => {
    dispatch(nsGroupActions.setSetupEditNameServerGroupVisible(false));
    dispatch(
      nsGroupActions.setNameServerGroup({
        id: "",
        name: "",
        description: "",
        primary: false,
        domains: [],
        nameservers: [] as NameServer[],
        groups: [],
        enabled: false,
      } as NameServerGroup)
    );
    setEditName(false);
    setIsPrimary(false);
  };

  const onChange = (changedValues: any) => {
    if (changedValues.primary !== undefined) {
      setIsPrimary(changedValues.primary);
    }
    setFormNSGroup({ ...formNSGroup, ...changedValues });
  };

  let googleChoice = "Google DNS";
  let cloudflareChoice = "Cloudflare DNS";
  let quad9Choice = "Quad9 DNS";
  let customChoice = "Add custom nameserver";

  let defaultDNSOptions: NameServerGroup[] = [
    {
      name: googleChoice,
      description: "Google DNS servers",
      domains: [],
      primary: true,
      nameservers: [
        {
          ip: "8.8.8.8",
          ns_type: "udp",
          port: 53,
        },
        {
          ip: "8.8.4.4",
          ns_type: "udp",
          port: 53,
        },
      ],
      groups: [],
      enabled: true,
    },
    {
      name: cloudflareChoice,
      description: "Cloudflare DNS servers",
      domains: [],
      primary: true,
      nameservers: [
        {
          ip: "1.1.1.1",
          ns_type: "udp",
          port: 53,
        },
        {
          ip: "1.0.0.1",
          ns_type: "udp",
          port: 53,
        },
      ],
      groups: [],
      enabled: true,
    },
    {
      name: quad9Choice,
      description: "Quad9 DNS servers",
      domains: [],
      primary: true,
      nameservers: [
        {
          ip: "9.9.9.9",
          ns_type: "udp",
          port: 53,
        },
        {
          ip: "149.112.112.112",
          ns_type: "udp",
          port: 53,
        },
      ],
      groups: [],
      enabled: true,
    },
  ];

  const handleFormSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        let nsGroupToSave = createNSGroupToSave(values as NameServerGroup);
        nsGroupToSave = { ...nsGroupToSave, enabled: formNSGroup.enabled };
        dispatch(
          nsGroupActions.saveNameServerGroup.request({
            getAccessTokenSilently: getTokenSilently,
            payload: nsGroupToSave,
          })
        );
      })
      .then(() => onCancel())
      .catch((errorInfo) => {
        let msg = "please check the fields and try again";
        if (errorInfo.errorFields) {
          msg = errorInfo.errorFields[0].errors[0];
        }
        message.error({
          content: msg,
          duration: 1,
        });
      });
  };

  const createNSGroupToSave = (
    values: NameServerGroup
  ): NameServerGroupToSave => {
    let [existingGroups, newGroups] = getExistingAndToCreateGroupsLists(
      values.groups
    );
    return {
      id: formNSGroup.id || null,
      name: values.name ? values.name : formNSGroup.name,
      description: values.description
        ? values.description
        : formNSGroup.description,
      primary: values.domains.length ? false : true,
      domains: values.primary ? [] : values.domains,
      nameservers: values.nameservers,
      groups: existingGroups,
      groupsToCreate: newGroups,
      enabled: values.enabled,
    } as NameServerGroupToSave;
  };

  const toggleEditName = (status: boolean) => {
    setEditName(status);
  };

  const toggleEditDescription = (status: boolean) => {
    setEditDescription(status);
  };

  const domainRegex =
    /(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/;

  const domainValidator = (_: RuleObject, domain: string) => {
    if (domainRegex.test(domain)) {
      return Promise.resolve();
    }
    setIsPrimary(false);
    return Promise.reject(
      new Error(
        "Please enter a valid domain, e.g. example.com or intra.example.com"
      )
    );
  };

  const nameValidator = (_: RuleObject, value: string) => {
    const found = nsGroupData.find(
      (u) => u.name == value && u.id !== formNSGroup.id
    );
    if (found) {
      return Promise.reject(
        new Error(
          "Please enter a unique name for your nameserver configuration"
        )
      );
    }

    return Promise.resolve();
  };

  const ipValidator = (_: RuleObject, value: string) => {
    if (!cidrRegex().test(value + "/32")) {
      return Promise.reject(
        new Error("Please enter a valid IP, e.g. 192.168.1.1 or 8.8.8.8")
      );
    }

    return Promise.resolve();
  };

  // @ts-ignore
  const formListValidator = (_: RuleObject, names) => {
    if (names.length >= 3) {
      return Promise.reject(
        new Error("Exceeded maximum number of Nameservers. (Max is 2)")
      );
    }
    if (names.length < 1) {
      return Promise.reject(new Error("You should add at least 1 Nameserver"));
    }
    return Promise.resolve();
  };

  // @ts-ignore
  const renderNSList = (
    fields: FormListFieldData[],
    { add, remove }: any,
    { errors }: any
  ) => (
    <Row>
      <Col>
        <div style={{ width: "100%", maxWidth: "360px" }}>
          <label
            style={{
              color: "rgba(0, 0, 0, 0.88)",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "10px",
              display: "block",
            }}
          >
            Nameservers
          </label>

          {!!fields.length && (
            <Row align="middle">
              <Col span={4} style={{ textAlign: "left" }}>
                <Text style={{ color: "#818183", paddingLeft: "5px" }}></Text>
              </Col>
              <Col span={10} style={{ textAlign: "left" }}>
                <Text style={{ color: "#818183", paddingLeft: "5px" }}>
                  Nameserver IP
                </Text>
              </Col>
              <Col span={4} style={{ textAlign: "left" }}>
                <Text style={{ color: "#818183", paddingLeft: "5px" }}>
                  Port
                </Text>
              </Col>
              <Col span={4} />
            </Row>
          )}
          {fields.map((field, index) => {
            return (
              <Row key={index}>
                <Col span={4} style={{ textAlign: "left" }}>
                  <Form.Item
                    style={{ margin: "3px" }}
                    name={[field.name, "ns_type"]}
                    rules={[
                      { required: true, message: "Missing first protocol" },
                    ]}
                    initialValue={"udp"}
                  >
                    <Select
                      disabled
                      style={{ width: "100%" }}
                      className="style-like-text"
                    >
                      <Option value="udp">UDP</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={10} style={{ margin: "1px" }}>
                  <Form.Item
                    style={{ margin: "1px" }}
                    name={[field.name, "ip"]}
                    rules={[{ validator: ipValidator }]}
                  >
                    <Input
                      placeholder="e.g. X.X.X.X"
                      style={{ width: "100%" }}
                      autoComplete="off"
                    />
                  </Form.Item>
                </Col>
                <Col span={4} style={{ textAlign: "center" }}>
                  <Form.Item
                    style={{ margin: "1px" }}
                    name={[field.name, "port"]}
                    rules={[{ required: true, message: "Missing port" }]}
                    initialValue={53}
                  >
                    <InputNumber placeholder="Port" style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col
                  span={2}
                  style={{
                    textAlign: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MinusCircleOutlined onClick={() => remove(field.name)} />
                </Col>
              </Row>
            );
          })}

          <Row>
            <Col span={20}>
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  style={{
                    maxWidth: "270px",
                    marginTop: "5px",
                  }}
                  disabled={fields.length > 1}
                  icon={<PlusOutlined />}
                >
                  Add Nameserver
                </Button>
                <Form.ErrorList errors={errors} />
              </Form.Item>
            </Col>
          </Row>
        </div>
      </Col>
    </Row>
  );

  // @ts-ignore
  const renderDomains = (
    fields: FormListFieldData[],
    { add, remove }: any,
    { errors }: any
  ) => (
    <div style={{ width: "100%", maxWidth: "305px" }}>
      <Row>
        <Space>
          <Col>
            <label
              style={{
                color: "rgba(0, 0, 0, 0.88)",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Match domains
            </label>
            <Paragraph
              type={"secondary"}
              style={{
                marginTop: "-4px",
                fontWeight: "400",
                marginBottom: "4px",
              }}
            >
              Add domain if you want to have a specific one
            </Paragraph>
          </Col>
        </Space>
      </Row>
      {fields.map((field, index) => {
        return (
          <Row key={index} style={{ marginBottom: "5px" }}>
            <Col span={22}>
              <Form.Item
                style={{ margin: "0" }}
                // hidden={isPrimary}
                {...field}
                rules={[{ validator: domainValidator }]}
              >
                <Input
                  placeholder="e.g. example.com"
                  style={{ width: "100%" }}
                  autoComplete="off"
                />
              </Form.Item>
            </Col>
            <Col
              span={2}
              style={{
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MinusCircleOutlined
                // hidden={isPrimary}
                className="dynamic-delete-button"
                onClick={() => remove(field.name)}
              />
            </Col>
          </Row>
        );
      })}

      <Row>
        <Col span={24} style={{ margin: "1px" }}>
          <Form.Item>
            <Button
              type="dashed"
              onClick={() => add()}
              block
              icon={<PlusOutlined />}
              style={{ marginTop: "5px", maxWidth: "280px" }}
            >
              Add Domain
            </Button>
          </Form.Item>
        </Col>
      </Row>
      <Form.ErrorList errors={errors} />
    </div>
  );

  const handleChangeDisabled = (checked: boolean) => {
    setFormNSGroup({
      ...formNSGroup,
      enabled: checked,
    });
  };

  const onBreadcrumbUsersClick = () => {
    onCancel();
  };

  return (
    <>
      <Container style={{ paddingTop: "40px" }}>
        <Breadcrumb
          style={{ marginBottom: "25px" }}
          items={[
            {
              title: <a onClick={onBreadcrumbUsersClick}>DNS</a>,
            },
            {
              title: formNSGroup.name,
            },
          ]}
        />
        <Card>
          <Form
            layout="vertical"
            requiredMark={false}
            form={form}
            onValuesChange={onChange}
          >
            <Row gutter={16}>
              <Col span={24}>
                <Header
                  style={{
                    border: "none",
                  }}
                >
                  <Row align="top">
                    <Col flex="auto">
                      {!editName && formNSGroup.id ? (
                        <div
                          className={
                            "access-control input-text ant-drawer-title"
                          }
                          onClick={() => toggleEditName(true)}
                          style={{
                            fontSize: "22px",
                            margin: " 0px 0px 10px",
                            cursor: "pointer",
                            fontWeight: "500",
                            lineHeight: "24px",
                          }}
                        >
                          {formNSGroup.id
                            ? formNSGroup.name
                            : "New nameserver group"}
                        </div>
                      ) : (
                        <Row>
                          <Col span={8}>
                            <div style={{ lineHeight: "15px" }}>
                              <label
                                style={{
                                  color: "rgba(0, 0, 0, 0.88)",
                                  fontSize: "14px",
                                  fontWeight: "500",
                                }}
                              >
                                Name
                              </label>
                              <Form.Item
                                name="name"
                                rules={[
                                  {
                                    required: true,
                                    message:
                                      "Please add an identifier for this nameserver group",
                                    whitespace: true,
                                  },
                                  {
                                    validator: nameValidator,
                                  },
                                ]}
                                style={{
                                  marginBottom: "10px",
                                  marginTop: "10px",
                                }}
                              >
                                <Input
                                  placeholder="e.g. Public DNS"
                                  ref={inputNameRef}
                                  onPressEnter={() => toggleEditName(false)}
                                  onBlur={() => toggleEditName(false)}
                                  autoComplete="off"
                                  maxLength={40}
                                />
                              </Form.Item>
                            </div>
                          </Col>
                        </Row>
                      )}
                      {!editDescription ? (
                        <div
                          className={
                            "access-control input-text ant-drawer-subtitle"
                          }
                          style={{ margin: "0 0 39px 0px" }}
                          onClick={() => toggleEditDescription(true)}
                        >
                          {formNSGroup.description &&
                          formNSGroup.description.trim() !== ""
                            ? formNSGroup.description
                            : "Add description"}
                        </div>
                      ) : (
                        <Row>
                          <Col span={8} style={{ marginBottom: "15px" }}>
                            <div
                              style={{ lineHeight: "15px", marginTop: "24px" }}
                            >
                              <label
                                style={{
                                  color: "rgba(0, 0, 0, 0.88)",
                                  fontSize: "14px",
                                  fontWeight: "500",
                                }}
                              >
                                Description
                              </label>
                              <Form.Item
                                name="description"
                                style={{ marginTop: "8px" }}
                              >
                                <Input
                                  placeholder="Add description..."
                                  ref={inputDescriptionRef}
                                  onPressEnter={() =>
                                    toggleEditDescription(false)
                                  }
                                  onBlur={() => toggleEditDescription(false)}
                                  autoComplete="off"
                                />
                              </Form.Item>
                            </div>
                          </Col>
                        </Row>
                      )}
                    </Col>
                  </Row>
                </Header>
              </Col>
              <Col span={24} style={{ marginBottom: "15px" }}>
                <Form.Item name="enabled" label="">
                  <div
                    style={{
                      display: "flex",
                      gap: "15px",
                    }}
                  >
                    <Switch
                      onChange={handleChangeDisabled}
                      defaultChecked={formNSGroup.enabled}
                      size="small"
                      checked={formNSGroup.enabled}
                    />
                    <div>
                      <label
                        style={{
                          color: "rgba(0, 0, 0, 0.88)",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        Enabled
                      </label>
                      <Paragraph
                        type={"secondary"}
                        style={{
                          marginTop: "-2",
                          fontWeight: "400",
                          marginBottom: "0",
                        }}
                      >
                        Disable this server if you don't want it to apply
                        immediately
                      </Paragraph>
                    </div>
                  </div>
                </Form.Item>
              </Col>
              <Col span={24} style={{ marginBottom: "15px" }}>
                <Form.List
                  name="nameservers"
                  rules={[{ validator: formListValidator }]}
                >
                  {renderNSList}
                </Form.List>
              </Col>

              <Col span={24} style={{ marginBottom: "15px" }}>
                <Form.List name="domains">{renderDomains}</Form.List>
              </Col>
              <Col span={24} style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    color: "rgba(0, 0, 0, 0.88)",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Distribution groups
                </label>
                <Form.Item
                  name="groups"
                  rules={[{ validator: selectValidator }]}
                  style={{ maxWidth: "380px" }}
                >
                  <Select
                    mode="tags"
                    style={{ width: "100%" }}
                    placeholder="Associate groups with the NS group"
                    tagRender={blueTagRender}
                    onChange={handleChangeTags}
                    dropdownRender={dropDownRender}
                  >
                    {tagGroups.map((m) => (
                      <Option key={m}>{optionRender(m)}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col
                style={{
                  width: "100%",
                }}
              >
                <Space
                  style={{
                    display: "flex",
                    justifyContent: "start",
                    width: "100%",
                  }}
                >
                  <Button onClick={onCancel} disabled={savedNSGroup.loading}>
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    onClick={handleFormSubmit}
                    disabled={savedNSGroup.loading}
                  >
                    Save
                  </Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </Card>
      </Container>
    </>
  );
};

export default NameServerGroupUpdate;
