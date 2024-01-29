import { globalMetaTitle } from "@utils/meta";
import type { Metadata } from "next";
import AppLayout from "@/layouts/AppLayout";

export const metadata: Metadata = {
  title: `${globalMetaTitle}`,
  description:
    "NetBird combines a configuration-free peer-to-peer private network and a centralized access control system in a single open-source platform",
};
export default AppLayout;
