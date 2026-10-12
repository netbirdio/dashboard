import Paragraph from "@components/Paragraph";
import Separator from "@components/Separator";
import React from "react";

type Props = {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  button?: React.ReactNode;
  learnMore?: React.ReactNode;
};

export default function GetStarted({
  icon,
  title,
  description,
  button,
  learnMore,
}: Props) {
  return (
    <tfoot
      className={
        "absolute w-full h-full bg-nb-gray-950/70 z-20 left-0 top-0 flex backdrop-blur-sm"
      }
    >
      <tr className={"inline-flex justify-center w-full mt-24"}>
        <td>
          <div
            className={
              "max-w-lg relative z-50 bg-nb-gray-940  border border-nb-gray-900 rounded-lg shadow-2xl"
            }
          >
            <div className={"text-center flex flex-col gap-2 p-8"}>
              <div className={"mx-auto"}>{icon}</div>
              <div className={"text-center"}>
                <h1 className={"text-3xl font-medium max-w-lg mx-auto mt-3"}>
                  {title}
                </h1>
                <Paragraph className={"justify-center my-3"}>
                  {description}
                </Paragraph>
              </div>
              <div>{button}</div>
            </div>
            <Separator />
            <Paragraph className={"text-sm mt-2 justify-center pb-5 pt-4 px-8"}>
              {learnMore}
            </Paragraph>
          </div>
        </td>
      </tr>
    </tfoot>
  );
}
