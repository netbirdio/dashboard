import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "typesafe-actions";
import { actions as policyActions } from "../store/policy";
import {
  Button,
  Col,
  Divider,
  Drawer,
  Form,
  Input,
  Radio,
  RadioChangeEvent,
  Row,
  Select,
  SelectProps,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import {
  CloseOutlined,
  FlagFilled,
  QuestionCircleFilled,
} from "@ant-design/icons";
import type { CustomTagProps } from "rc-select/lib/BaseSelect";
import { Policy, PolicyToSave } from "../store/policy/types";
import { uniq } from "lodash";
import { Header } from "antd/es/layout/layout";
import { RuleObject } from "antd/lib/form";
import { useGetTokenSilently } from "../utils/token";

const { Paragraph } = Typography;
const { Option } = Select;

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

const AccessControlNew = () => {
  const { getTokenSilently } = useGetTokenSilently();
  const dispatch = useDispatch();
  const setupNewPolicyVisible = useSelector(
    (state: RootState) => state.policy.setupNewPolicyVisible
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
  const [tagGroups, setTagGroups] = useState([] as string[]);
  const [formPolicy, setFormPolicy] = useState({} as FormPolicy);
  const [form] = Form.useForm();
  const inputNameRef = useRef<any>(null);
  const inputDescriptionRef = useRef<any>(null);

  const optionsStatusEnabled = [
    { label: "Enabled", value: true },
    { label: "Disabled", value: false },
  ];

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
  }, [policy, form]);

  const createPolicyToSave = (): PolicyToSave => {
    const sources =
      groups
        ?.filter((g) => formPolicy.tagSourceGroups.includes(g.name))
            .map((g) => g.id || "") || [];
      console.log("sources", sources);
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
          sources,
          destinations,
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
    dispatch(policyActions.setSetupNewPolicyVisible(status));
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
    setFormPolicy({
      ...formPolicy,
      bidirectional:
        value === "all" || value === "icmp" ? true : formPolicy.bidirectional,
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

  const handleChangeDisabled = ({ target: { value } }: RadioChangeEvent) => {
    setFormPolicy({
      ...formPolicy,
      enabled: value,
    });
  };

  const handleChangeBidirect = (checked: boolean) => {
    setFormPolicy({
      ...formPolicy,
      bidirectional: checked,
    });
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
    if (g)
      peersCount = ` - ${g.peers_count || 0} ${
        !g.peers_count || parseInt(g.peers_count) !== 1 ? "peers" : "peer"
      } `;
    return (
      <>
        <Tag color="blue" style={{ marginRight: 3 }}>
          <strong>{label}</strong>
        </Tag>
        <span style={{ fontSize: ".85em" }}>{peersCount}</span>
      </>
    );
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
          <span style={{ color: "#9CA3AF" }}>
            Add new ports or range by pressing "Enter"
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

  const toggleEditName = (status: boolean) => {
    setEditName(status);
  };

  const toggleEditDescription = (status: boolean) => {
    setEditDescription(status);
  };

  // const testDeleteGroup = () => {
  //     groups.forEach(g => {
  //         dispatch(groupsActions.deleteGroup.request({getAccessTokenSilently, payload: g.ID || ''}))
  //     })
  // }

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
        if (Number.isNaN(p) || p < 1 || p > 65535) {
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

  return (
    <>
      {policy && (
        <Drawer
          headerStyle={{ display: "none" }}
          forceRender={true}
          visible={setupNewPolicyVisible}
          bodyStyle={{ paddingBottom: 80 }}
          onClose={onCancel}
          autoFocus={true}
          footer={
            <Space style={{ display: "flex", justifyContent: "end" }}>
              <Button onClick={onCancel} disabled={savedPolicy.loading}>
                Cancel
              </Button>
              <Button
                type="primary"
                disabled={savedPolicy.loading}
                onClick={handleFormSubmit}
              >{`${formPolicy.id ? "Save" : "Create"}`}</Button>
            </Space>
          }
        >
          <Form
            layout="vertical"
            hideRequiredMark
            form={form}
            onValuesChange={onChange}
          >
            <Row gutter={16}>
              <Col span={24}>
                <Header
                  style={{
                    margin: "-32px -24px 20px -24px",
                    padding: "24px 24px 0 24px",
                  }}
                >
                  <Row align="top">
                    <Col flex="none" style={{ display: "flex" }}>
                      {!editName && !editDescription && formPolicy.id && (
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
                      {!editName && formPolicy.id ? (
                        <div
                          className={
                            "access-control input-text ant-drawer-title"
                          }
                          onClick={() => toggleEditName(true)}
                        >
                          {formPolicy.id ? formPolicy.name : "New Rule"}
                        </div>
                      ) : (
                        <Form.Item
                          name="name"
                          label="Name"
                          rules={[
                            {
                              required: true,
                              message: "Please add a name for this access rule",
                              whitespace: true,
                            },
                          ]}
                        >
                          <Input
                            placeholder="Add rule name..."
                            ref={inputNameRef}
                            onPressEnter={() => toggleEditName(false)}
                            onBlur={() => toggleEditName(false)}
                            autoComplete="off"
                          />
                        </Form.Item>
                      )}
                      {!editDescription ? (
                        <div
                          className={
                            "access-control input-text ant-drawer-subtitle"
                          }
                          onClick={() => toggleEditDescription(true)}
                        >
                          {formPolicy.description &&
                          formPolicy.description.trim() !== ""
                            ? formPolicy.description
                            : "Add description..."}
                        </div>
                      ) : (
                        <Form.Item
                          name="description"
                          label="Description"
                          style={{ marginTop: 24 }}
                        >
                          <Input
                            placeholder="Add description..."
                            ref={inputDescriptionRef}
                            onPressEnter={() => toggleEditDescription(false)}
                            onBlur={() => toggleEditDescription(false)}
                            autoComplete="off"
                          />
                        </Form.Item>
                      )}
                    </Col>
                  </Row>
                  <Row align="top">
                    <Col flex="auto"></Col>
                  </Row>
                </Header>
              </Col>
              <Col span={24}></Col>
              <Col span={24}>
                <Form.Item name="enabled" label="Status">
                  <Radio.Group
                    options={optionsStatusEnabled}
                    onChange={handleChangeDisabled}
                    optionType="button"
                    buttonStyle="solid"
                    defaultValue={false}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="tagSourceGroups"
                  label="Source groups"
                  rules={[{ validator: selectValidator }]}
                >
                  <Select
                    mode="tags"
                    style={{ width: "100%" }}
                    placeholder="Tags Mode"
                    tagRender={tagRender}
                    onChange={handleChangeSource}
                    dropdownRender={dropDownRenderGroups}
                  >
                    {tagGroups.map((m) => (
                      <Option key={m}>{optionRender(m)}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="bidirectional"
                  label="Bi-Direct traffic flow"
                  tooltip="Protocol type 'All' or 'ICMP' must be bi-directional. Directional traffic for TCP and UDP protocol requires at least one port to be defined."
                >
                  <Switch
                    size={"small"}
                    disabled={
                      formPolicy.protocol === "all" ||
                      formPolicy.protocol === "icmp"
                    }
                    checked={formPolicy.bidirectional}
                    onChange={handleChangeBidirect}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="tagDestinationGroups"
                  label="Destination groups"
                  rules={[{ validator: selectValidator }]}
                >
                  <Select
                    mode="tags"
                    style={{ width: "100%" }}
                    placeholder="Tags Mode"
                    tagRender={tagRender}
                    onChange={handleChangeDestination}
                    dropdownRender={dropDownRenderGroups}
                  >
                    {tagGroups.map((m) => (
                      <Option key={m}>{optionRender(m)}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="protocol" label="Protocol">
                  <Select
                    style={{ width: "100%" }}
                    options={protocols}
                    onChange={handleChangeProtocol}
                    defaultValue={"all"}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="ports"
                  label="Ports"
                  rules={[
                    {
                      message: "Directional traffic requires at least one port",
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
                    style={{ width: "100%" }}
                    placeholder="Tags Mode"
                    tagRender={tagRender}
                    onChange={handleChangePorts}
                    dropdownRender={dropDownRenderPorts}
                    disabled={
                      formPolicy.protocol === "all" ||
                      formPolicy.protocol === "icmp"
                    }
                  >
                    {formPolicy &&
                      formPolicy.ports?.map((m) => (
                        <Option key={m}>
                          <Tag color="blue" style={{ marginRight: 3 }}>
                            <strong>{m}</strong>
                          </Tag>
                        </Option>
                      ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Row wrap={false} gutter={12}>
                  <Col flex="none">
                    <FlagFilled />
                  </Col>
                  <Col flex="auto">
                    <Paragraph>
                      The default behavior is to drop all traffic that doesn't
                      match an Access control rule.
                    </Paragraph>
                    <Paragraph>
                      If you want to enable all peers of the same group to talk
                      to each other - you can add that group both as a receiver
                      and as a destination.
                    </Paragraph>
                    <Paragraph>
                      Protocol type <strong>All</strong> or{" "}
                      <strong>ICMP</strong> must be bi-directional. Directional
                      traffic for <strong>TCP</strong> and <strong>UDP</strong>{" "}
                      protocol requires at least one port to be defined.
                    </Paragraph>
                  </Col>
                </Row>
              </Col>
              <Col span={24}>
                <Divider></Divider>
                <Button
                  icon={<QuestionCircleFilled />}
                  type="link"
                  target="_blank"
                  href="https://docs.netbird.io/how-to/manage-network-access"
                >
                  Learn more about access controls
                </Button>
              </Col>
            </Row>
          </Form>
        </Drawer>
      )}
    </>
  );
};

export default AccessControlNew;
