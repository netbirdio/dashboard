import Card from "@components/Card";
import Paragraph from "@components/Paragraph";
import SquareIcon from "@components/SquareIcon";
import { LockIcon } from "lucide-react";
import * as React from "react";
import Skeleton from "react-loading-skeleton";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { Role } from "@/interfaces/User";

type Props = {
  children: React.ReactNode;
  allow?: Role[];
  page?: string;
};
export const RestrictedAccess = ({
  children,
  allow = [Role.Admin, Role.Owner],
  page = "this page",
}: Props) => {
  const { loggedInUser } = useLoggedInUser();

  const isAllowed = loggedInUser
    ? allow.includes(loggedInUser?.role as Role)
    : false;

  return isAllowed ? (
    <>{children}</>
  ) : (
    <div className={"px-8"}>
      <div
        className={
          "absolute left-0 top-0 h-full w-full p-10 flex items-center justify-center mx-auto backdrop-blur-sm"
        }
      >
        <Card className={" relative overflow-hidden"}>
          <div
            className={
              "absolute z-20 bg-gradient-to-b  dark:to-nb-gray-950 dark:from-nb-gray-950/40 w-full h-full"
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
          <div className={"w-full h-full z-20 relative left-0 top-0 flex py-8"}>
            <div className={"inline-flex justify-center w-full"}>
              <div>
                <div className={"max-w-lg relative z-50"}>
                  <div className={"text-center flex flex-col gap-2 p-8"}>
                    <div className={"mx-auto"}>
                      {" "}
                      <SquareIcon
                        icon={<LockIcon size={20} />}
                        color={"red"}
                        size={"large"}
                      />
                    </div>
                    <div className={"text-center"}>
                      <h1
                        className={"text-3xl font-medium max-w-lg mx-auto mt-3"}
                      >
                        {"You don't have access to"} <br /> {page}
                      </h1>
                      <Paragraph className={"justify-center my-3"}>
                        {
                          "Seems like you don't have access to this page. Only users with admin access can visit this page. Please contact your network administrator for further information."
                        }
                      </Paragraph>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
