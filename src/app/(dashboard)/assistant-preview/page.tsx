"use client";

import Paragraph from "@components/Paragraph";
import PageContainer from "@/layouts/PageContainer";
import AssistantPreview from "@/modules/assistant/preview/AssistantPreview";

export default function AssistantPreviewPage() {
  return (
    <PageContainer>
      <div className={"p-default py-6 flex flex-col gap-5"}>
        <div>
          <h1>Assistant Preview</h1>
          <Paragraph>
            Every component the assistant can render, in the real thread. For
            checking layout and styling without a running assistant server.
          </Paragraph>
        </div>
        <AssistantPreview />
      </div>
    </PageContainer>
  );
}
