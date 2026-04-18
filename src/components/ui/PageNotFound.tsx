import Button from "@components/Button";
import Card from "@components/Card";
import Paragraph from "@components/Paragraph";
import SquareIcon from "@components/SquareIcon";
import { CircleAlertIcon, Undo2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import Skeleton from "react-loading-skeleton";
import PageContainer from "@/layouts/PageContainer";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  title?: string;
  description?: string;
};
export const PageNotFound = ({
  title,
  description,
}: Props) => {
  const router = useRouter();
  const { t } = useI18n();

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
                          {title ?? t("pageNotFound.title")}
                        </h1>
                        <Paragraph className={"justify-center my-3 max-w-xl"}>
                          {description ?? t("pageNotFound.description")}
                        </Paragraph>
                        <Button
                          variant={"secondary"}
                          className={"mt-3"}
                          onClick={() => router.back()}
                        >
                          <Undo2Icon size={15} className={"shrink-0"} />
                          {t("pageNotFound.goBack")}
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
