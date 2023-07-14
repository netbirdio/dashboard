import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "typesafe-actions";
import {
  Button,
  Card,
  Col,
  Form,
  message,
  Row,
  Select,
  Space,
  Typography,
} from "antd";
import { useGetTokenSilently } from "../utils/token";
import { useGetGroupTagHelpers } from "../utils/groups";
import { actions as dnsSettingsActions } from "../store/dns-settings";
import { DNSSettings, DNSSettingsToSave } from "../store/dns-settings/types";
import { actions as nsGroupActions } from "../store/nameservers";

const { Paragraph } = Typography;
const styleNotification = { marginTop: 85 };

export const DNSSettingsForm = () => {
  const { getTokenSilently } = useGetTokenSilently();
  const dispatch = useDispatch();

  const {
    blueTagRender,
    handleChangeTags,
    dropDownRender,
    optionRender,
    tagGroups,
    getExistingAndToCreateGroupsLists,
    getGroupNamesFromIDs,
    selectValidatorEmptyStrings,
  } = useGetGroupTagHelpers();

  const dnsSettings = useSelector(
    (state: RootState) => state.dnsSettings.dnsSettings
  );
  const dnsSettingsData = useSelector(
    (state: RootState) => state.dnsSettings.data
  );
  const savedDNSSettings = useSelector(
    (state: RootState) => state.dnsSettings.savedDNSSettings
  );
  const loading = useSelector((state: RootState) => state.dnsSettings.loading);

  const [form] = Form.useForm();

  useEffect(() => {
    dispatch(
      dnsSettingsActions.getDNSSettings.request({
        getAccessTokenSilently: getTokenSilently,
        payload: null,
      })
    );
  }, []);

  useEffect(() => {
    if (!dnsSettingsData) return;
    dispatch(
      dnsSettingsActions.setDNSSettings({
        disabled_management_groups: getGroupNamesFromIDs(
          dnsSettingsData.disabled_management_groups
        ),
      })
    );
  }, [dnsSettingsData]);

  useEffect(() => {
    form.setFieldsValue(dnsSettings);
  }, [dnsSettings]);

  const createKey = "saving";
  useEffect(() => {
    if (savedDNSSettings.loading) {
      message.loading({
        content: "Saving...",
        key: createKey,
        duration: 0,
        style: styleNotification,
      });
    } else if (savedDNSSettings.success) {
      message.success({
        content: "DNS settings has been successfully saved.",
        key: createKey,
        duration: 2,
        style: styleNotification,
      });
      dispatch(
        dnsSettingsActions.setSavedDNSSettings({
          ...savedDNSSettings,
          success: false,
        })
      );
      dispatch(dnsSettingsActions.resetSavedDNSSettings(null));
    } else if (savedDNSSettings.error) {
      let errorMsg = "Failed to update DNS settings";
      switch (savedDNSSettings.error.statusCode) {
        case 403:
          errorMsg =
            "Failed to update DNS settings. You might not have enough permissions.";
          break;
        default:
          errorMsg = savedDNSSettings.error.data.message
            ? savedDNSSettings.error.data.message
            : errorMsg;
          break;
      }
      message.error({
        content: errorMsg,
        key: createKey,
        duration: 5,
        style: styleNotification,
      });
      dispatch(
        dnsSettingsActions.setSavedDNSSettings({
          ...savedDNSSettings,
          error: null,
        })
      );
      dispatch(nsGroupActions.resetSavedNameServerGroup(null));
    }
  }, [savedDNSSettings]);

  const handleFormSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        let dnsSettingsToSave = createDNSSettingsToSave(values);
        dispatch(
          dnsSettingsActions.saveDNSSettings.request({
            getAccessTokenSilently: getTokenSilently,
            payload: dnsSettingsToSave,
          })
        );
      })
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

  const createDNSSettingsToSave = (values: DNSSettings): DNSSettingsToSave => {
    let [existingGroups, newGroups] = getExistingAndToCreateGroupsLists(
      values.disabled_management_groups
    );
    return {
      disabled_management_groups: existingGroups,
      groupsToCreate: newGroups,
    } as DNSSettingsToSave;
  };

  return (
    <>
      <Paragraph>Manage your account's DNS settings</Paragraph>
      <Col>
        <Form
          name="basic"
          autoComplete="off"
          form={form}
          onFinish={handleFormSubmit}
        >
          <Space direction={"vertical"} style={{ display: "flex" }}>
            <Card loading={loading}>
              <div
                style={{
                  color: "rgba(0, 0, 0, 0.88)",
                  fontWeight: "500",
                  fontSize: "22px",
                  marginBottom: "20px",
                }}
              >
                DNS Management
              </div>
              <Row>
                <Col span={10}>
                  <label
                    style={{
                      color: "rgba(0, 0, 0, 0.88)",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    Disable DNS management for these groups
                  </label>
                  <Paragraph
                    type={"secondary"}
                    style={{
                      marginTop: "-2",
                      fontWeight: "400",
                      marginBottom: "5px",
                    }}
                  >
                    Peers in these groups will require manual domain name
                    resolution
                  </Paragraph>
                </Col>
              </Row>
              <Row>
                <Col span={8}>
                  <Form.Item
                    name="disabled_management_groups"
                    rules={[{ validator: selectValidatorEmptyStrings }]}
                  >
                    <Select
                      mode="tags"
                      style={{ width: "100%" }}
                      tagRender={blueTagRender}
                      onChange={handleChangeTags}
                      dropdownRender={dropDownRender}
                    >
                      {tagGroups.map((m) => (
                        <Select.Option key={m}>{optionRender(m)}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item style={{ marginBottom: "0" }}>
                    <Button type="primary" htmlType="submit">
                      Save
                    </Button>
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Space>
        </Form>
      </Col>
    </>
  );
};

export default DNSSettingsForm;
