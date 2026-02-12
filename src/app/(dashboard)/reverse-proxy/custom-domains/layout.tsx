import { globalMetaTitle } from "@utils/meta";
import type { Metadata } from "next";
import BlankLayout from "@/layouts/BlankLayout";

export const metadata: Metadata = {
  title: `Custom Domains - Reverse Proxy - ${globalMetaTitle}`,
};
export default BlankLayout;
