import Button from "@components/Button";
import Card from "@components/Card";
import Paragraph from "@components/Paragraph";
import SquareIcon from "@components/SquareIcon";
import { CircleAlertIcon, Undo2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import Skeleton from "react-loading-skeleton";
import PageContainer from "@/layouts/PageContainer";

type Props = {
  title?: string;
  description?: string;
};
export const PageNotFound = ({
  title = "The requested page was not found",
  description = "The page you are attempting to access cannot be found. Please verify the URL or return to the dashboard to continue browsing.",
}: Props) => {
  const router = useRouter();

  return (
    <PageContainer>
      <div className={"px-8"}>
        <div
          className={
            "absolute left-0 top-0 h-full w-full p-10 flex items-center justify-center mx-auto backdrop-blur-sm"
          }
        >
          <Card className={"relative overflow-hidden max-w-4xl"}>
            <div
              className={
                "absolute z-20 bg-gradient-to-b dark:to-nb-gray-950 dark:from-nb-gray-950/40 w-full h-full"
              }
            ></div>
            <div
              className={
                "absolute w-full h-full left-0 top-0 z-10 px-5 py-3 overflow-hidden"
              }
            >
              <div className={"flex flex-col gap-2"}>
                <Skeleton className={"w-full"} height={70} duration={4} />
                <Skeleton className={"w-full"} height={70} duration={4} />
                <Skeleton className={"w-full"} height={70} duration={4} />
                <Skeleton className={"w-full"} height={70} duration={4} />
                <Skeleton className={"w-full"} height={70} duration={4} />
              </div>
            </div>
            <div
              className={"w-full h-full z-20 relative left-0 top-0 flex py-8"}
            >
              <div className={"inline-flex justify-center w-full"}>
                <div>
                  <div className={"max-w-2xl relative z-50"}>
                    <div className={"text-center flex flex-col gap-2 p-8"}>
                      <div className={"mx-auto"}>
                        {" "}
                        <SquareIcon
                          icon={<CircleAlertIcon size={20} />}
                          color={"netbird"}
                          size={"large"}
                        />
                      </div>
                      <div className={"text-center"}>
                        <h1
                          className={
                            "text-3xl font-medium mx-auto mt-3 capitalize"
                          }
                        >
                          {title}
                        </h1>
                        <Paragraph className={"justify-center my-3 max-w-xl"}>
                          {description}
                        </Paragraph>
                        <Button
                          variant={"secondary"}
                          className={"mt-3"}
                          onClick={() => router.back()}
                        >
                          <Undo2Icon size={15} className={"shrink-0"} />
                          Go Back
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};
