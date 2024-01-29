import Code from "@components/Code";
import Steps from "@components/Steps";
import TabsContentPadding, { TabsContent } from "@components/Tabs";
import { GRPC_API_ORIGIN } from "@utils/netbird";
import { ShoppingBagIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import AppStoreButton from "@/assets/app-store-badge.png";
import { OperatingSystem } from "@/interfaces/OperatingSystem";

export default function IOSTab() {
  return (
    <TabsContent value={String(OperatingSystem.IOS)}>
      <TabsContentPadding>
        <p className={"font-medium flex gap-3 items-center text-base"}>
          <ShoppingBagIcon size={16} />
          Install on iOS
        </p>
        <Steps>
          <Steps.Step step={1}>
            <p>Download and install the application on the App Store:</p>
            <div className={"flex gap-4 mt-1"}>
              <Link
                href={"https://apps.apple.com/app/netbird-p2p-vpn/id6469329339"}
                target={"_blank"}
              >
                <Image
                  src={AppStoreButton}
                  alt={"Download NetBird on the App Store"}
                  height={50}
                />
              </Link>
            </div>
          </Steps.Step>
          {GRPC_API_ORIGIN && (
            <Steps.Step step={2}>
              <p>
                {`Click on "Change Server" and enter the following "Server"`}
              </p>
              <Code>
                <Code.Line>{GRPC_API_ORIGIN}</Code.Line>
              </Code>
            </Steps.Step>
          )}

          <Steps.Step step={GRPC_API_ORIGIN ? 3 : 2}>
            <p>
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              Click on the "Connect" button in the middle of the screen
            </p>
          </Steps.Step>
          <Steps.Step step={GRPC_API_ORIGIN ? 4 : 3} line={false}>
            <p>Sign up using your email address</p>
          </Steps.Step>
        </Steps>
      </TabsContentPadding>
    </TabsContent>
  );
}
