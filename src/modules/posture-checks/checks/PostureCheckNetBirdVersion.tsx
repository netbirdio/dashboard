import Button from "@components/Button";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { ModalClose, ModalFooter } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import { validator } from "@utils/helpers";
import { isEmpty } from "lodash";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { NetBirdVersionCheck } from "@/interfaces/PostureCheck";
import { PostureCheckCard } from "@/modules/posture-checks/ui/PostureCheckCard";
import { useTranslations } from "next-intl";

type Props = {
	value?: NetBirdVersionCheck;
	onChange: (value: NetBirdVersionCheck | undefined) => void;
	disabled?: boolean;
};

export const PostureCheckNetBirdVersion = ({
	value,
	onChange,
	disabled,
}: Props) => {
	const t = useTranslations("postureChecks");
	const [open, setOpen] = useState(false);

	return (
		<PostureCheckCard
			open={open}
			setOpen={setOpen}
			key={open ? 1 : 0}
			active={value?.min_version !== undefined}
			title={t("netBirdClientVersion")}
			description={t("netBirdClientVersionHelp")}
			icon={<NetBirdIcon size={18} />}
			modalWidthClass={"max-w-lg"}
			onReset={() => onChange(undefined)}
		>
			<CheckContent
				value={value}
				onChange={(v) => {
					onChange(v);
					setOpen(false);
				}}
				disabled={disabled}
			/>
		</PostureCheckCard>
	);
};

const CheckContent = ({ value, onChange, disabled }: Props) => {
	const t = useTranslations("postureChecks");
	const tCommon = useTranslations("common");
	const [version, setVersion] = useState(value?.min_version || "");

	const versionError = useMemo(() => {
		if (version == "") return "";
		const validSemver = validator.isValidVersion(version);
		if (!validSemver) return t("minimumRequiredVersionError");
	}, [version]);

	const canSave = useMemo(() => {
		return (
			!versionError &&
			version !== value?.min_version &&
			!isEmpty(version) &&
			!disabled
		);
	}, [version, versionError, value, disabled]);

	return (
		<>
			<div className={"flex flex-col px-8 gap-3 pb-6"}>
				<div>
					<Label>{t("minimumRequiredVersion")}</Label>
					<HelpText>{t("minimumRequiredVersionHelp")}</HelpText>
					<div>
						<Input
							className={"max-w-[200px]"}
							value={version}
							onChange={(e) => setVersion(e.target.value)}
							placeholder={t("minimumRequiredVersionPlaceholder")}
							error={versionError}
							customPrefix={t("version")}
							disabled={disabled}
						/>
					</div>
				</div>
			</div>
			<ModalFooter className={"items-center"}>
				<div className={"w-full"}>
					<Paragraph className={"text-sm mt-auto"}>
						{t("learnMoreAbout")}
						<InlineLink
							href={
								"https://docs.netbird.io/how-to/manage-posture-checks#net-bird-client-version-check"
							}
							target={"_blank"}
						>
							{t("netBirdClientVersionCheck")}
							<ExternalLinkIcon size={12} />
						</InlineLink>
					</Paragraph>
				</div>
				<div className={"flex gap-3 w-full justify-end"}>
					<ModalClose asChild={true}>
						<Button variant={"secondary"}>{tCommon("cancel")}</Button>
					</ModalClose>
					<Button
						variant={"primary"}
						disabled={!canSave}
						onClick={() => {
							if (isEmpty(version)) {
								onChange(undefined);
							} else {
								onChange({ min_version: version });
							}
						}}
					>
						{tCommon("save")}
					</Button>
				</div>
			</ModalFooter>
		</>
	);
};
