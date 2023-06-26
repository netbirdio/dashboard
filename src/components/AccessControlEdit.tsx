import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "typesafe-actions";
import { actions as policyActions } from "../store/policy";
import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  Card,
  Row,
  Select,
  SelectProps,
  Switch,
  Tag,
  Typography,
  Breadcrumb,
} from "antd";
import inbound from "../assets/in_bound.svg";
import outBoundGreen from "../assets/out_bound_green.svg";
import outBoundblue from "../assets/out_bound_blue.svg";
import reverseDefault from "../assets/reverse_default.svg";
import forwardDefault from "../assets/forward_default.svg";
import reverseGreen from "../assets/reverse_green.svg";
import type { CustomTagProps } from "rc-select/lib/BaseSelect";
import { Policy, PolicyToSave } from "../store/policy/types";
import { uniq } from "lodash";
import { Header } from "antd/es/layout/layout";
import { RuleObject } from "antd/lib/form";
import { useGetTokenSilently } from "../utils/token";
import { Container } from "./Container";
import { useGetGroupTagHelpers } from "../utils/groups";

const { Paragraph } = Typography;
const { Option } = Select;
const { Text } = Typography;

interface FormPolicy {
  id?: string;
  name: string;
  description: string;
  enabled: boolean;
  query: string;
  bidirectional: boolean;
  protocol: string;
  ports: string[];
  action: string;
  tagSourceGroups: string[];
  tagDestinationGroups: string[];
}

const AccessControlEdit = () => {
  const { optionRender, blueTagRender, grayTagRender } =
    useGetGroupTagHelpers();

  const { getTokenSilently } = useGetTokenSilently();
  const dispatch = useDispatch();
  const setupEditPolicyVisible = useSelector(
    (state: RootState) => state.policy.setupEditPolicyVisible
  );
  const groups = useSelector((state: RootState) => state.group.data);
  const actions: SelectProps["options"] = [
    { label: "Accept", value: "accept" },
    { label: "Drop", value: "drop" },
  ];
  const protocols: SelectProps["options"] = [
    { label: "All", value: "all" },
    { label: "TCP", value: "tcp" },
    { label: "UDP", value: "udp" },
    { label: "ICMP", value: "icmp" },
  ];
  const policy = useSelector((state: RootState) => state.policy.policy);
  const savedPolicy = useSelector(
    (state: RootState) => state.policy.savedPolicy
  );
  const [editName, setEditName] = useState(false);
  const [editDescription, setEditDescription] = useState(false);
  const [direction, setDirection] = useState<any>({
    biDirectional: false,
    reverseDirectional: false,
  });
  const [tagGroups, setTagGroups] = useState([] as string[]);
  const [formPolicy, setFormPolicy] = useState({} as FormPolicy);
  const [form] = Form.useForm();
  const inputNameRef = useRef<any>(null);
  const inputDescriptionRef = useRef<any>(null);
  useEffect(() => {
    //Unmounting component clean
    return () => {
      onCancel();
    };
  }, []);

  useEffect(() => {
    if (editName) inputNameRef.current!.focus({ cursor: "end" });
  }, [editName]);
  useEffect(() => {
    if (editDescription) inputDescriptionRef.current!.focus({ cursor: "end" });
  }, [editDescription]);
  useEffect(() => {
    setTagGroups(groups?.map((g) => g.name) || []);
  }, [groups]);
  useEffect(() => {
    if (!policy) return;
    const fPolicy = {
      id: policy.id,
      name: policy.name,
      description: policy.description,
      enabled: policy.enabled,
      query: "",
      bidirectional: policy.rules[0].bidirectional,
      protocol: policy.rules[0].protocol,
      ports: policy.rules[0].ports,
      action: policy.rules[0].action,
      tagSourceGroups: policy.rules[0].sources
        ? policy.rules[0].sources?.map((t) => t.name)
        : [],
      tagDestinationGroups: policy.rules[0].destinations
        ? policy.rules[0].destinations?.map((t) => t.name)
        : [],
    } as FormPolicy;
    setFormPolicy(fPolicy);
    form.setFieldsValue(fPolicy);
    if (fPolicy.bidirectional) {
      setDirection({
        biDirectional: true,
        reverseDirectional: true,
      });
    } else {
      setDirection({
        biDirectional: false,
        reverseDirectional: false,
      });
    }
  }, [policy, form]);

  const createPolicyToSave = (): PolicyToSave => {
    const sources =
      groups
        ?.filter((g) => formPolicy.tagSourceGroups.includes(g.name))
        .map((g) => g.id || "") || [];
    const destinations =
      groups
        ?.filter((g) => formPolicy.tagDestinationGroups.includes(g.name))
        .map((g) => g.id || "") || [];
    const sourcesNoId = formPolicy.tagSourceGroups.filter(
      (s) => !tagGroups.includes(s)
    );
    const destinationsNoId = formPolicy.tagDestinationGroups.filter(
      (s) => !tagGroups.includes(s)
    );
    const groupsToSave = uniq([...sourcesNoId, ...destinationsNoId]);
    return {
      id: formPolicy.id,
      name: formPolicy.name,
      description: formPolicy.description,
      enabled: formPolicy.enabled,
      sourcesNoId,
      destinationsNoId,
      groupsToSave,
      rules: [
        {
          id: formPolicy.id,
          name: formPolicy.name,
          description: formPolicy.description,
          enabled: formPolicy.enabled,
          sources:
            direction.reverseDirectional && !direction.biDirectional
              ? destinations
              : sources,
          destinations:
            direction.reverseDirectional && !direction.biDirectional
              ? sources
              : destinations,
          bidirectional: formPolicy.bidirectional,
          protocol: formPolicy.protocol,
          ports: formPolicy.ports,
          action: "accept",
        },
      ],
    } as PolicyToSave;
  };

  const handleFormSubmit = () => {
    form
      .validateFields()
      .then((_) => {
        const policyToSave = createPolicyToSave();
        dispatch(
          policyActions.savePolicy.request({
            getAccessTokenSilently: getTokenSilently,
            payload: policyToSave,
          })
        );
      })
      .catch((errorInfo) => {
        console.log("errorInfo", errorInfo);
      });
  };

  const setVisibleNewRule = (status: boolean) => {
    dispatch(policyActions.setSetupEditPolicyVisible(status));
  };

  const onCancel = () => {
    if (savedPolicy.loading) return;
    setEditName(false);
    dispatch(
      policyActions.setPolicy({
        name: "",
        description: "",
        enabled: true,
        query: "",
        rules: [
          {
            name: "",
            description: "",
            enabled: true,
            sources: [],
            destinations: [],
            bidirectional: true,
            protocol: "all",
            ports: [],
            action: "accept",
          },
        ],
      } as Policy)
    );
    setVisibleNewRule(false);
  };

  const onChange = (data: any) => {
    setFormPolicy({ ...formPolicy, ...data });
  };

  const handleChangeSource = (value: string[]) => {
    setFormPolicy({
      ...formPolicy,
      tagSourceGroups: value,
    });
  };

  const handleChangeDestination = (value: string[]) => {
    setFormPolicy({
      ...formPolicy,
      tagDestinationGroups: value,
    });
  };

  const handleChangeProtocol = (value: string) => {
    if (value === "all" || value === "icmp") {
      setDirection({
        biDirectional: true,
        reverseDirectional: true,
      });
    }
    setFormPolicy({
      ...formPolicy,
      ports: value === "all" || value === "icmp" ? [] : formPolicy.ports,
      protocol: value,
    });
  };

  const handleChangePorts = (value: string[]) => {
    setFormPolicy({
      ...formPolicy,
      ports: value,
    });
  };

  const handleChangeDisabled = (checked: boolean) => {
    setFormPolicy({
      ...formPolicy,
      enabled: checked,
    });
  };

  const handleChangeBidirect = (checked: boolean) => {
    setFormPolicy({
      ...formPolicy,
      bidirectional: checked,
    });
  };

  const dropDownRenderGroups = (menu: React.ReactElement) => (
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

  const dropDownRenderPorts = (menu: React.ReactElement) => (
    <>
      {menu}
      <Divider style={{ margin: "8px 0" }} />
      <Row style={{ padding: "0 8px 4px" }}>
        <Col flex="auto">
          <Text type={"secondary"}>Add new ports by pressing "Enter"</Text>
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

  const toggleEditDescription = (status: boolean) => {
    setEditDescription(status);
  };

  const selectValidator = (_: RuleObject, value: string[]) => {
    let hasSpaceNamed = [];
    if (!value.length) {
      return Promise.reject(new Error("Please enter at least one group"));
    }

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

  const selectPortRangeValidator = (_: RuleObject, value: string[]) => {
    if (value) {
      var failed = false;
      value.forEach(function (v: string) {
        let p = Number(v);
        if (Number.isNaN(p) || p < 1 || p > 65535 || !Number.isInteger(p)) {
          failed = true;
          return;
        }
      });
      if (failed) {
        return Promise.reject(
          new Error("Port value must be in 1..65535 range")
        );
      }
    }
    return Promise.resolve();
  };

  const selectPortProtocolValidator = (_: RuleObject, value: string[]) => {
    if (!formPolicy.bidirectional && value.length === 0) {
      return Promise.reject(new Error("Directional traffic require ports"));
    }
    return Promise.resolve();
  };

  const handleDirection = (directionValue: string) => {
    if (
      directionValue === "forwardDirectional" &&
      !direction.reverseDirectional
    ) {
      setDirection({
        biDirectional: false,
        reverseDirectional: false,
      });
    }

    if (
      directionValue === "forwardDirectional" &&
      direction.reverseDirectional
    ) {
      setDirection({
        ...direction,
        biDirectional: !direction.biDirectional,
      });
    }

    if (directionValue === "reverseDirectional" && direction.biDirectional) {
      setDirection({
        biDirectional: false,
        reverseDirectional: !direction.reverseDirectional,
      });
    }

    if (directionValue === "reverseDirectional" && !direction.biDirectional) {
      setDirection({
        biDirectional: true,
        reverseDirectional: true,
      });
    }
  };

  const onBreadcrumbUsersClick = () => {
    onCancel();
  };

  const toggleEditName = (status: boolean) => {
    setEditName(status);
  };

  useEffect(() => {
    if (Object.keys(formPolicy).length > 0) {
      setFormPolicy({
        ...formPolicy,
        bidirectional: direction.biDirectional,
      });
    }
  }, [direction]);
  return (
    <>
      {policy && (
        <Container style={{ paddingTop: "40px" }}>
          <Breadcrumb
            style={{ marginBottom: "25px" }}
            items={[
              {
                title: <a onClick={onBreadcrumbUsersClick}>Access Control</a>,
              },
              {
                title: policy.name,
              },
            ]}
          />
          <Card
            bordered={true}
            // title={setupKey.name}
            style={{ marginBottom: "7px" }}
          >
            <div style={{ maxWidth: "550px" }}>
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
                      {!editName && (
                        <Paragraph
                          style={{
                            textAlign: "start",
                            whiteSpace: "pre-line",
                            fontSize: "22px",
                            margin: "0px",
                            marginBottom: "10px",
                            cursor: "pointer",
                            fontWeight: "500",
                          }}
                          onDoubleClick={() => toggleEditName(true)}
                        >
                          {formPolicy.name}
                        </Paragraph>
                      )}
                      <Row align="top">
                        <Col flex="auto">
                          {editName && (
                            <>
                              <Paragraph
                                style={{
                                  whiteSpace: "pre-line",
                                  margin: 0,
                                  fontWeight: "500",
                                }}
                              >
                                Rule name
                              </Paragraph>
                              <Form.Item
                                name="name"
                                label=""
                                style={{ margin: "0" }}
                                rules={[
                                  {
                                    required: true,
                                    message:
                                      "Please add a name for this access rule",
                                    whitespace: true,
                                  },
                                ]}
                              >
                                <Input
                                  placeholder={'for example "UserAccessRule"'}
                                  ref={inputNameRef}
                                  onPressEnter={() => toggleEditName(false)}
                                  onBlur={() => toggleEditName(false)}
                                  autoComplete="off"
                                />
                              </Form.Item>
                            </>
                          )}

                          {!editDescription ? (
                            <div
                              style={{
                                margin: "12px 0 30px",
                                lineHeight: "22px",
                                cursor: "pointer",
                              }}
                              onClick={() => toggleEditDescription(true)}
                            >
                              {formPolicy.description &&
                              formPolicy.description.trim() !== "" ? (
                                formPolicy.description
                              ) : (
                                <span style={{ textDecoration: "underline" }}>
                                  Add description
                                </span>
                              )}
                            </div>
                          ) : (
                            <Form.Item
                              name="description"
                              label="Description"
                              style={{ marginTop: 24, fontWeight: "500" }}
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
                          )}
                        </Col>
                      </Row>
                    </Header>
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
                          defaultChecked={policy.enabled}
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
                            {formPolicy.enabled
                              ? "Disable this rule to apply it later"
                              : "Enable this rule to apply it immediately"}
                          </Paragraph>
                        </div>
                      </div>
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Row gutter={15}>
                      <Col span={10}>
                        <Form.Item
                          name="tagSourceGroups"
                          label="Source groups"
                          rules={[{ validator: selectValidator }]}
                          style={{ fontWeight: "500" }}
                        >
                          <Select
                            mode="tags"
                            style={{ width: "100%", fontWeight: "500" }}
                            placeholder="Select groups"
                            tagRender={blueTagRender}
                            onChange={handleChangeSource}
                            dropdownRender={dropDownRenderGroups}
                          >
                            {tagGroups.map((m) => (
                              <Option key={m}>{optionRender(m)}</Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col
                        span={4}
                        style={{ padding: "0 2.5px", lineHeight: "16px" }}
                      >
                        <Button
                          type={"ghost"}
                          disabled={
                            formPolicy.protocol === "all" ||
                            formPolicy.protocol === "icmp"
                          }
                          onClick={() => handleDirection("forwardDirectional")}
                          style={{
                            padding: "0",
                            width: "100%",
                            marginTop: "30px",
                            height: "13px",
                          }}
                        >
                          <Tag
                            style={{
                              marginInlineEnd: "0",
                              width: "100%",
                              textAlign: "center",
                              height: "13px",
                              display: "flex",
                              justifyContent: "center",
                            }}
                            color={
                              !direction.biDirectional &&
                              !direction.reverseDirectional
                                ? "processing"
                                : direction.biDirectional
                                ? "green"
                                : "default"
                            }
                          >
                            {!direction.biDirectional &&
                            !direction.reverseDirectional ? (
                              <img
                                src={outBoundblue}
                                style={{
                                  width: "100%",
                                  maxWidth: "45px",
                                }}
                                alt="out icon"
                              />
                            ) : direction.biDirectional ? (
                              <img
                                src={outBoundGreen}
                                alt="out icon"
                                style={{
                                  width: "100%",
                                  maxWidth: "45px",
                                }}
                              />
                            ) : (
                              <img
                                src={forwardDefault}
                                style={{
                                  width: "100%",
                                  maxWidth: "45px",
                                }}
                                alt="out icon"
                              />
                            )}
                          </Tag>
                        </Button>
                        <Button
                          type="ghost"
                          disabled={
                            formPolicy.protocol === "all" ||
                            formPolicy.protocol === "icmp"
                          }
                          onClick={() => handleDirection("reverseDirectional")}
                          style={{
                            padding: "0",
                            width: "100%",
                            textAlign: "center",
                            height: "13px",
                            marginTop: "0",
                          }}
                        >
                          <Tag
                            style={{
                              marginInlineEnd: "0",
                              width: "100%",
                              textAlign: "center",
                              height: "13px",
                              display: "flex",
                              justifyContent: "center",
                            }}
                            color={
                              direction.reverseDirectional &&
                              direction.biDirectional
                                ? "green"
                                : direction.reverseDirectional
                                ? "processing"
                                : "default"
                            }
                          >
                            {direction.reverseDirectional &&
                            direction.biDirectional ? (
                              <img
                                src={reverseGreen}
                                style={{
                                  width: "100%",
                                  maxWidth: "45px",
                                }}
                                alt="out icon"
                              />
                            ) : direction.reverseDirectional ? (
                              <img
                                src={inbound}
                                style={{
                                  width: "100%",
                                  maxWidth: "45px",
                                }}
                                alt="out icon"
                              />
                            ) : (
                              <img
                                src={reverseDefault}
                                style={{
                                  width: "100%",
                                  maxWidth: "45px",
                                }}
                                alt="out icon"
                              />
                            )}
                          </Tag>
                        </Button>
                      </Col>
                      <Col span={10}>
                        <Form.Item
                          name="tagDestinationGroups"
                          label="Destination groups"
                          rules={[{ validator: selectValidator }]}
                          style={{ fontWeight: "500" }}
                        >
                          <Select
                            mode="tags"
                            style={{ width: "100%", fontWeight: "500" }}
                            placeholder="Select groups"
                            tagRender={blueTagRender}
                            onChange={handleChangeDestination}
                            dropdownRender={dropDownRenderGroups}
                          >
                            {tagGroups.map((m) => (
                              <Option key={m}>{optionRender(m)}</Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Col>
                  <Col span={24}>
                    <Paragraph
                      type={"secondary"}
                      style={{ marginTop: "-15px", marginBottom: "30px" }}
                    >
                      To change traffic direction and ports, select TCP or UDP
                      protocol below
                    </Paragraph>
                  </Col>
                  <Col span={24}>
                    <Row>
                      <Col span={10}>
                        <Form.Item
                          name="protocol"
                          label="Protocol"
                          style={{ fontWeight: "500" }}
                          className="tag-box"
                        >
                          <Select
                            style={{ width: "100%", maxWidth: "260px" }}
                            options={protocols}
                            onChange={handleChangeProtocol}
                            className="menlo-font"
                            defaultValue={"all"}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Col>

                  <Col span={24}>
                    <Row>
                      <Col span={10}>
                        <Form.Item
                          name="ports"
                          label="Ports"
                          style={{ fontWeight: "500" }}
                          rules={[
                            {
                              message:
                                "Directional traffic requires at least one port",
                              validator: selectPortProtocolValidator,
                              required: false,
                            },
                            {
                              message: "Port value must be in 1..65535 range",
                              validator: selectPortRangeValidator,
                              required: false,
                            },
                          ]}
                        >
                          <Select
                            mode="tags"
                            style={{
                              width: "100%",
                              maxWidth: "260px",
                              fontWeight: "500",
                            }}
                            placeholder={
                              formPolicy.protocol === "all" ||
                              formPolicy.protocol === "icmp"
                                ? "All"
                                : "Add ports"
                            }
                            tagRender={grayTagRender}
                            onChange={handleChangePorts}
                            className="menlo-font"
                            dropdownRender={dropDownRenderPorts}
                            disabled={
                              formPolicy.protocol === "all" ||
                              formPolicy.protocol === "icmp"
                            }
                          >
                            {formPolicy &&
                              formPolicy.ports?.map((m) => (
                                <Option key={m}>
                                  <Tag style={{ marginRight: 3 }}>{m}</Tag>
                                </Option>
                              ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Form>
            </div>
            <Container
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "start",
                padding: 0,
                gap: "10px",
                marginTop: "30px",
              }}
              key={0}
            >
              <Button onClick={onCancel} disabled={savedPolicy.loading}>
                Cancel
              </Button>
              <Button
                type="primary"
                disabled={savedPolicy.loading}
                onClick={handleFormSubmit}
              >{`${formPolicy.id ? "Save" : "Create"}`}</Button>
            </Container>
          </Card>
        </Container>
      )}
    </>
  );
};

export default AccessControlEdit;
