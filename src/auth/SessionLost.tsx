import { useOidc } from "@axa-fr/react-oidc";
import Button from "@components/Button";
import Paragraph from "@components/Paragraph";
import loadConfig from "@utils/config";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useEffect } from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";

const config = loadConfig();

export const SessionLost = () => {
	const t = useTranslations("auth");
	const router = useRouter();
	const { logout } = useOidc();

	useEffect(() => {
		router.push("/peers");
	});

	return (
		<div
			className={
				"flex items-center justify-center flex-col h-screen max-w-md mx-auto"
			}
		>
			<div
				className={
					"bg-nb-gray-930 mb-3 border border-nb-gray-900 h-10 w-10 rounded-md flex items-center justify-center "
				}
			>
				<NetBirdIcon size={20} />
			</div>
			<h1>{t("sessionExpired")}</h1>
			<Paragraph className={"text-center"}>
				{t("sessionExpiredDescription")}
			</Paragraph>
			<Button
				variant={"primary"}
				size={"sm"}
				className={"mt-5"}
				onClick={() => logout("", { client_id: config.clientId })}
			>
				{t("login")}
				<LogIn size={16} />
			</Button>
		</div>
	);
};
