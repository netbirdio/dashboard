import React, { useState } from "react";

import { Button, Divider, Row, Tooltip, Typography } from "antd";
import TabSteps from "./TabSteps";
import { StepCommand } from "./types";
import { formatNetBirdUP } from "./common";
import { Collapse } from "antd";
import SyntaxHighlighter from "react-syntax-highlighter";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { CheckOutlined, CopyOutlined } from "@ant-design/icons";
import { copyToClipboard } from "../../../../utils/common";
import {getConfig} from "../../../../config";
const { grpcApiOrigin } = getConfig();

const { Panel } = Collapse;

const { Text } = Typography;

export const LinuxTab = () => {
  const [copied, setCopied] = useState(false);
  const [quickSteps, setQuickSteps] = useState([
    {
      key: 1,
      title: (
        <Row>
          <Text>Download and run MacOS installer: </Text>
          <Tooltip
            title={
              <text>
                If you don't know what chip your Mac has, you can find out by
                clicking on the Apple logo in the top left corner of your screen
                and selecting 'About This Mac'. For more information click{" "}
                <a
                  href="https://support.apple.com/en-us/HT211814"
                  target="_blank"
                >
                  here
                </a>
              </text>
            }
            className={"ant-form-item-tooltip"}
          >
            <QuestionCircleOutlined
              style={{
                color: "rgba(0, 0, 0, 0.45)",
                cursor: "help",
                marginLeft: "3px",
              }}
            />
          </Tooltip>
        </Row>
      ),
      commands: (
        <Row style={{ paddingTop: "5px" }}>
          <Button
            data-testid="download-intel-button"
            style={{ marginRight: "10px" }}
            type="primary"
            href="https://pkgs.netbird.io/macos/amd64"
          >
            Download for Intel
          </Button>
          <Button
            data-testid="download-m1-m2-button"
            style={{ marginRight: "10px" }}
            type="default"
            href="https://pkgs.netbird.io/macos/arm64"
          >
            Download for M1 & M2
          </Button>
        </Row>
      ),
      copied: false,
    } as StepCommand,
    ... grpcApiOrigin ? [{
      key: 2,
      title: 'Click on "Settings" from the NetBird icon in your system tray and enter the following "Management URL"',
      commands: grpcApiOrigin,
      commandsForCopy: grpcApiOrigin,
      copied: false,
      showCopyButton: false,
    }] : [],
    {
      key: 2 + (grpcApiOrigin ? 1 : 0),
      title: 'Click on "Connect" from the NetBird icon in your system tray',
      commands: "",
      copied: false,
      showCopyButton: false,
    },
    {
      key: 3 + (grpcApiOrigin) ? 1 : 0,
      title: "Sign up using your email address",
      commands: "",
      copied: false,
      showCopyButton: false,
    },
  ]);

  const [steps, setSteps] = useState([
    {
      key: 1,
      title: "Download and install Homebrew",
      commands: (
        <Button
          style={{ marginTop: "5px" }}
          type="primary"
          href="https://brew.sh/"
          target="_blank"
        >
          Download Brew
        </Button>
      ),
      copied: false,
    } as StepCommand,
    {
      key: 2,
      title: "Install NetBird:",
      commands: [
        `# for CLI only`,
        `brew install netbirdio/tap/netbird`,
        `# for GUI package`,
        `brew install --cask netbirdio/tap/netbird-ui`,
      ].join("\n"),
      commandsForCopy: [
        `brew install netbirdio/tap/netbird`,
        `brew install --cask netbirdio/tap/netbird-ui`,
      ].join("\n"),
      copied: false,
      showCopyButton: true,
    } as StepCommand,
    {
      key: 3,
      title: "Start NetBird daemon:",
      commands: [
        `sudo netbird service install`,
        `sudo netbird service start`,
      ].join("\n"),
      commandsForCopy: [
        `sudo netbird service install`,
        `sudo netbird service start`,
      ].join("\n"),
      copied: false,
      showCopyButton: true,
    } as StepCommand,
    {
      key: 4,
      title: "Run NetBird and log in the browser:",
      commands: formatNetBirdUP(),
      commandsForCopy: formatNetBirdUP(),
      copied: false,
      showCopyButton: true,
    } as StepCommand,
  ]);

  const onCopyClick = () => {
    const stringToCopy = "curl -fsSL https://pkgs.netbird.io/install.sh | sh";
    copyToClipboard(stringToCopy);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };
    
  return (
    <div style={{ marginTop: 10 }}>
      <Text style={{ fontWeight: "bold" }}>Install on MacOS</Text>
      <div style={{ marginTop: 5, marginBottom: 5 }}>
        <TabSteps stepsItems={quickSteps} />
      </div>
      <div style={{ marginTop: 0 }} />
      {/*<Divider style={{marginTop: "5px"}} />*/}
      <Collapse bordered={false} style={{ backgroundColor: "unset" }}>
        <Panel
          className="CustomPopupCollapse"
          header={<Text strong={true}>Or install via command line</Text>}
          key="1"
        >
          <div style={{ marginLeft: "25px" }}>
            <Text style={{ fontWeight: "bold" }}>Install with one command</Text>
            <div
              style={{
                fontSize: ".85em",
                marginTop: 5,
                marginBottom: 25,
                position: "relative",
              }}
            >
              {!copied ? (
                <Button
                  type="text"
                  size="middle"
                  className="btn-copy-code peer"
                  icon={<CopyOutlined />}
                  style={{ color: "rgb(107, 114, 128)", top: "0", zIndex: "3" }}
                  onClick={onCopyClick}
                />
              ) : (
                <Button
                  type="text"
                  size="middle"
                  className="btn-copy-code peer"
                  icon={<CheckOutlined />}
                  style={{ color: "green", top: "0", zIndex: "3" }}
                />
              )}
              <SyntaxHighlighter language="bash">
                curl -fsSL https://pkgs.netbird.io/install.sh | sh
              </SyntaxHighlighter>
            </div>
            <Text style={{ fontWeight: "bold" }}>
              Or install manually with HomeBrew
            </Text>
            <div style={{ marginTop: 5 }}>
              <TabSteps stepsItems={steps} />
            </div>
          </div>
        </Panel>
      </Collapse>
    </div>
  );
};

export default LinuxTab;
