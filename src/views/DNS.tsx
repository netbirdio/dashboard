import React, { useEffect, useState } from "react";
import { Container } from "../components/Container";
import { Col, Row, Tabs, Typography } from "antd";
import type { TabsProps } from "antd";
import NameServerGroupUpdate from "../components/NameServerGroupUpdate";
import NameServerGroupAdd from "../components/NameServerGroupAdd";
import Nameservers from "./Nameservers";
import { actions as groupActions } from "../store/group";
import { useGetTokenSilently } from "../utils/token";
import { useDispatch, useSelector } from "react-redux";
import DNSSettingsForm from "./DNSSettings";
import { RootState } from "typesafe-actions";
import { actions as dnsSettingsActions } from "../store/dns-settings";
import { useGetGroupTagHelpers } from "../utils/groups";

const { Title, Paragraph } = Typography;

export const DNS = () => {
  const { getTokenSilently } = useGetTokenSilently();
  const dispatch = useDispatch();
  const { getGroupNamesFromIDs } = useGetGroupTagHelpers();

  const dnsSettingsData = useSelector(
    (state: RootState) => state.dnsSettings.data
  );
  const setupEditNameServerGroupVisible = useSelector(
    (state: RootState) => state.nameserverGroup.setupEditNameServerGroupVisible
  );
  const setupNewNameServerGroupVisible = useSelector(
    (state: RootState) => state.nameserverGroup.setupNewNameServerGroupVisible
  );
  useEffect(() => {
    dispatch(
      groupActions.getGroups.request({
        getAccessTokenSilently: getTokenSilently,
        payload: null,
      })
    );
  }, []);

  const nsTabKey = "1";
  const items: TabsProps["items"] = [
    {
      key: nsTabKey,
      label: "Nameservers",
      children: <Nameservers />,
    },
    {
      key: "2",
      label: "Settings",
      children: <DNSSettingsForm />,
    },
  ];

  const onTabClick = (key: string) => {
    if (key == nsTabKey) {
      if (!dnsSettingsData) return;
      dispatch(
        dnsSettingsActions.setDNSSettings({
          disabled_management_groups: getGroupNamesFromIDs(
            dnsSettingsData.disabled_management_groups
          ),
        })
      );
    }
  };

  return (
    <>
      {!setupEditNameServerGroupVisible && (
        <Container style={{ paddingTop: "40px" }}>
          <Row>
            <Col span={24}>
              <Tabs
                defaultActiveKey={nsTabKey}
                items={items}
                onTabClick={onTabClick}
                animated={{ inkBar: true, tabPane: false }}
                tabPosition="top"
              />
            </Col>
          </Row>
        </Container>
      )}
      {setupEditNameServerGroupVisible && <NameServerGroupUpdate />}
      {setupNewNameServerGroupVisible && <NameServerGroupAdd />}
    </>
  );
};

export default DNS;
