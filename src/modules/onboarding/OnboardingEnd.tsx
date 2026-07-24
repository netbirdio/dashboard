import { useOidcUser } from "@axa-fr/react-oidc";
import Button from "@components/Button";
import { ArrowRightIcon, PlayIcon } from "lucide-react";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import * as React from "react";
import { useTranslations } from "next-intl";
import ACLImage from "@/assets/onboarding/acl.png";
import ActivityImage from "@/assets/onboarding/activity.png";
import PostureCheckImage from "@/assets/onboarding/posture.png";

type Props = {
  onFinish?: () => void;
};

export const OnboardingEnd = ({ onFinish }: Props) => {
	const { oidcUser: user } = useOidcUser();
	const name = user?.given_name || user?.name || user?.preferred_username;
	const t = useTranslations("onboarding");

	const title = name ? t("congratulationsName", { name }) : t("congratulations");

	return (
		<div className={"relative flex flex-col h-full justify-between"}>
			<div>
				<h1 className={"text-xl text-center max-w-sm mx-auto"}>
					{title} <br />
					{t("completedOnboarding")}
				</h1>
				<div
					className={
						"text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
					}
				>
					{t("whatsNext")}
				</div>

				<div className={"mt-8 flex flex-col gap-8"}>
					<VideoGuide
						title={t("videoAccessControlTitle")}
						src={ACLImage}
						description={t("videoAccessControlDescription")}
						href={"https://www.youtube.com/watch?v=WtZD_q-g_Jc"}
					/>
					<VideoGuide
						title={t("videoIdPTitle")}
						src={PostureCheckImage}
						description={t("videoIdPDescription")}
						href={"https://www.youtube.com/watch?v=RxYWTpf7cgY"}
					/>
					<VideoGuide
						title={t("videoHowNetBirdWorksTitle")}
						description={t("videoHowNetBirdWorksDescription")}
						src={ActivityImage}
						href={"https://www.youtube.com/watch?v=CFa7SY4Up9k&t=261s"}
					/>
				</div>

				<div className={"mt-10 flex items-center justify-center"}>
					<Button variant={"secondaryLighter"} onClick={onFinish}>
						{t("goToDashboard")}
						<ArrowRightIcon size={16} />
					</Button>
				</div>
			</div>
		</div>
	);
};

type VideoGuideProps = {
	src?: string | StaticImageData;
	title: string;
	description: string;
	href?: string;
};

const VideoGuide = ({
	src = ACLImage,
	title,
	description,
	href = "#",
}: VideoGuideProps) => {
  return (
    <div
      className={
        "flex flex-col sm:flex-row gap-3 items-center text-center sm:text-left sm:gap-6"
      }
    >
      <Link
        className={
          "border border-nb-gray-900 rounded-lg p-[2px] bg-nb-gray-920 min-w-[160px] max-w-[160px] relative group hover:bg-nb-gray-900 transition-all"
        }
        target={"_blank"}
        href={href}
      >
        <span
          className={
            "flex items-center justify-center absolute left-0 top-0 h-full w-full"
          }
        >
          <div
            className={
              "bg-nb-gray-900/50 group-hover:bg-nb-gray-600/50 backdrop-blur h-8 w-8 flex items-center justify-center rounded-full"
            }
          >
            <PlayIcon size={14} />
          </div>
        </span>
        <Image
          src={src}
          alt={title}
          className={"border border-nb-gray-900 rounded-md"}
        />
      </Link>
      <div>
        <div className={"text-md"}>{title}</div>
        <div
          className={"text-[0.8rem] text-nb-gray-300 font-light mt-1.5 block"}
        >
          {description}
        </div>
      </div>
    </div>
  );
};
