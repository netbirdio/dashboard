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
  Modal,
  Row,
  Select,
  Space,
  Typography,
} from "antd";
import {
  CloseOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
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

const { Paragraph, Text } = Typography;

interface formNSGroup extends NameServerGroup {}

const NameServerGroupAdd = () => {
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
  const setupNewNameServerGroupVisible = useSelector(
    (state: RootState) => state.nameserverGroup.setupNewNameServerGroupVisible
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
  const [selectCustom, setSelectCustom] = useState(false);

  useEffect(() => {
    if (editName)
      inputNameRef.current!.focus({
        cursor: "end",
      });
  }, [editName]);

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
    if (nsGroup.id) {
      setSelectCustom(true);
    }
    if (nsGroup.primary !== undefined) {
      setIsPrimary(nsGroup.primary);
    }
  }, [nsGroup]);

  const onCancel = () => {
    dispatch(nsGroupActions.setSetupNewNameServerGroupVisible(false));
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
    setSelectCustom(false);
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

  const handleSelectChange = (value: string) => {
    let nsGroupLocal = {} as NameServerGroup;
    if (value === customChoice) {
      nsGroupLocal = nsGroup;
    } else {
      defaultDNSOptions.forEach((nsg) => {
        if (value === nsg.name) {
          nsGroupLocal = nsg;
        }
      });
    }
    let newFormGroup = {
      ...nsGroupLocal,
      groups: getGroupNamesFromIDs(nsGroupLocal.groups),
    } as formNSGroup;
    setFormNSGroup(newFormGroup);
    form.setFieldsValue(newFormGroup);
    setSelectCustom(true);
  };

  const handleFormSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        const nsGroupToSave = createNSGroupToSave(values as NameServerGroup);
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
            <Typography.Text
              style={{ color: "#818183", paddingLeft: "5px" }}
            ></Typography.Text>
          </Col>
          <Col span={10} style={{ textAlign: "left" }}>
            <Typography.Text style={{ color: "#818183", paddingLeft: "5px" }}>
              Nameserver IP
            </Typography.Text>
          </Col>
          <Col span={4} style={{ textAlign: "left" }}>
            <Typography.Text style={{ color: "#818183", paddingLeft: "5px" }}>
              Port
            </Typography.Text>
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
                rules={[{ required: true, message: "Missing first protocol" }]}
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
              Add nameserver
            </Button>
            <Form.ErrorList errors={errors} />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );

  // @ts-ignore
  const renderDomains = (
    fields: FormListFieldData[],
    { add, remove }: any,
    { errors }: any
  ) => (
    <>
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
              style={{ marginTop: "5px" }}
            >
              Add Domain
            </Button>
          </Form.Item>
        </Col>
      </Row>
      <Form.ErrorList errors={errors} />
    </>
  );

  const handleChangeDisabled = (checked: boolean) => {
    setFormNSGroup({
      ...formNSGroup,
      enabled: checked,
    });
  };

  return (
    <>
      {nsGroup && (
        <Modal
          forceRender={true}
          footer={false}
          onCancel={onCancel}
          open={setupNewNameServerGroupVisible}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Paragraph
                style={{
                  textAlign: "start",
                  whiteSpace: "pre-line",
                  fontSize: "18px",
                  fontWeight: "500",
                }}
              >
                Add nameserver
              </Paragraph>
              <Paragraph
                type={"secondary"}
                style={{
                  textAlign: "start",
                  whiteSpace: "pre-line",
                  marginTop: "-20px",
                  fontSize: "14px",
                  paddingBottom: "25px",
                  marginBottom: "4px",
                }}
              >
                Use this nameserver to resolve domains in your network
              </Paragraph>
            </Col>
          </Row>
          {selectCustom ? (
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
                      <Col flex="none" style={{ display: "flex" }}>
                        {!editName && !editDescription && formNSGroup.id && (
                          <button
                            type="button"
                            aria-label="Close"
                            className="ant-drawer-close"
                            style={{ paddingTop: 3 }}
                            onClick={onCancel}
                          >
                            <span
                              role="img"
                              aria-label="close"
                              className="anticon anticon-close"
                            >
                              <CloseOutlined size={16} />
                            </span>
                          </button>
                        )}
                      </Col>
                      <Col flex="auto">
                        {!editName && formNSGroup.id ? (
                          <div
                            className={
                              "access-control input-text ant-drawer-title"
                            }
                            onClick={() => toggleEditName(true)}
                          >
                            {formNSGroup.id
                              ? formNSGroup.name
                              : "New nameserver group"}
                          </div>
                        ) : (
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
                        )}
                        {!editDescription ? (
                          <div
                            className={
                              "access-control input-text ant-drawer-subtitle"
                            }
                            style={{ marginTop: "0" }}
                            onClick={() => toggleEditDescription(true)}
                          >
                            {formNSGroup.description &&
                            formNSGroup.description.trim() !== ""
                              ? formNSGroup.description
                              : "Add description"}
                          </div>
                        ) : (
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
                        )}
                      </Col>
                    </Row>
                  </Header>
                </Col>
                <Col span={24}>
                  <Form.List
                    name="nameservers"
                    rules={[{ validator: formListValidator }]}
                  >
                    {renderNSList}
                  </Form.List>
                </Col>
                <Col span={24}>
                  <Form.List name="domains">{renderDomains}</Form.List>
                </Col>
                <Col span={24}>
                  <label
                    style={{
                      color: "rgba(0, 0, 0, 0.88)",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    Distribution groups
                  </label>
                  <Paragraph
                    type={"secondary"}
                    style={{
                      marginTop: "-4px",
                      fontWeight: "400",
                      marginBottom: "4px",
                    }}
                  >
                    Advertise this route to peers that belong to the following
                    groups
                  </Paragraph>
                  <Form.Item
                    name="groups"
                    rules={[{ validator: selectValidator }]}
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
                <Col span={24}>
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
                <Col
                  span={24}
                  style={{ marginTop: "10px", marginBottom: "24px" }}
                >
                  <Text type={"secondary"}>
                    Learn more about
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href="https://docs.netbird.io/how-to/manage-dns-in-your-network"
                    >
                      {" "}
                      DNS
                    </a>
                  </Text>
                </Col>
                <Col
                  style={{
                    width: "100%",
                  }}
                >
                  <Space
                    style={{
                      display: "flex",
                      justifyContent: "end",
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
                      Create nameserver
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Form>
          ) : (
            <>
              <Space direction={"vertical"} style={{ width: "100%" }}>
                <Row align="middle">
                  <Col span={24} style={{ textAlign: "left" }}>
                    <span className="ant-form-item font-500">
                      Select a predefined one
                    </span>
                  </Col>
                </Row>
                <Row align="middle">
                  <Col span={24} style={{ textAlign: "center" }}>
                    <Select
                      style={{ width: "100%" }}
                      onChange={handleSelectChange}
                      options={[
                        {
                          value: googleChoice,
                          label: googleChoice,
                        },
                        {
                          value: cloudflareChoice,
                          label: cloudflareChoice,
                        },
                        {
                          value: quad9Choice,
                          label: quad9Choice,
                        },
                        {
                          value: customChoice,
                          label: customChoice,
                        },
                      ]}
                    />
                  </Col>
                </Row>
                <Row align="middle">
                  <Col span={24} style={{ textAlign: "left" }}>
                    <Col span={24} style={{ textAlign: "left" }}>
                      <span className="ant-form-item blue-color">
                        <Typography.Link
                          onClick={() => handleSelectChange(customChoice)}
                        >
                          or create custom
                        </Typography.Link>
                      </span>
                    </Col>
                  </Col>
                </Row>
              </Space>
              <Space
                style={{
                  display: "flex",
                  justifyContent: "end",
                  marginTop: "25px",
                }}
              >
                <Button onClick={onCancel} type="primary">
                  Cancel
                </Button>
              </Space>
            </>
          )}
        </Modal>
      )}
    </>
  );
};

export default NameServerGroupAdd;
