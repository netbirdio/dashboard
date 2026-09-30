"use client";

import Button from "@components/Button";
import Image from "next/image";
import * as React from "react";
import { ArrowRight } from "lucide-react";
import NetBirdLogoFull from "@/assets/netbird-full.svg";

type Props = {
  onLogin: () => void;
};

export const LoginScreen = ({ onLogin }: Props) => {
  return (
    <div className={"flex w-screen h-screen bg-nb-gray-950"}>
      <div
        className={
          "relative flex flex-col w-full lg:w-1/2 px-8 sm:px-16 lg:px-24"
        }
      >
        <div className={"pt-10"}>
          <Image src={NetBirdLogoFull} height={24} alt={"NetBird Logo"} />
        </div>

        <div className={"flex flex-col justify-center flex-1 max-w-md"}>
          <h1 className={"text-3xl font-medium text-white mb-2"}>
            Welcome back
          </h1>
          <p className={"text-nb-gray-300 mb-8"}>
            Sign in to access your NetBird network.
          </p>

          <Button variant={"primary"} size={"lg"} onClick={onLogin}>
            Sign in
            <ArrowRight size={16} />
          </Button>

          <p className={"text-sm text-nb-gray-400 mt-8"}>
            Don&apos;t have an account yet?{" "}
            <a
              href={"https://netbird.io/pricing"}
              target={"_blank"}
              rel={"noreferrer"}
              className={"text-netbird underline underline-offset-4"}
            >
              Get started
            </a>
          </p>
        </div>
      </div>

      <div
        className={
          "hidden lg:flex flex-col items-center justify-center w-1/2 bg-nb-gray-920 border-l border-nb-gray-900 px-16"
        }
      >
        <div
          className={
            "relative w-full max-w-md rounded-2xl bg-nb-gray-950 border border-nb-gray-900 p-6 shadow-xl"
          }
        >
          <div className={"flex items-center justify-between mb-6"}>
            <span className={"text-sm text-nb-gray-300"}>Connected peers</span>
            <span className={"flex items-center gap-2 text-xs text-nb-gray-400"}>
              <span className={"w-2 h-2 rounded-full bg-netbird"} /> Active
              <span className={"w-2 h-2 rounded-full bg-nb-blue ml-2"} /> Idle
            </span>
          </div>
          <div className={"flex flex-col gap-3"}>
            {[90, 76, 64, 48, 33, 22].map((w, i) => (
              <div key={i} className={"h-3 w-full rounded-full bg-nb-gray-900"}>
                <div
                  className={
                    i % 2 === 0
                      ? "h-3 rounded-full bg-netbird"
                      : "h-3 rounded-full bg-nb-blue"
                  }
                  style={{ width: `${w}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        <p className={"text-sm text-nb-gray-400 mt-10"}>
          Secure networking, zero config
        </p>
        <h2
          className={
            "text-2xl font-medium text-white text-center mt-2 max-w-md"
          }
        >
          Connect your devices into a secure private network in minutes.
        </h2>
      </div>
    </div>
  );
};
