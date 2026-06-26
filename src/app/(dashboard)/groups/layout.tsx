import { getTranslations } from "next-intl/server";
import { globalMetaTitle } from "@utils/meta";
import type { Metadata } from "next";
import BlankLayout from "@/layouts/BlankLayout";

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations();
	return {
		title: `${t("navigation.groups")} - ${globalMetaTitle}`,
	};
}

export default BlankLayout;
