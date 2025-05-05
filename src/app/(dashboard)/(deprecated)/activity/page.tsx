"use client";

import FullScreenLoading from "@components/ui/FullScreenLoading";
import { useRedirect } from "@hooks/useRedirect";
import React from "react";

export default function Redirect() {
  useRedirect("/events/audit");
  return <FullScreenLoading height={"auto"} />;
}
