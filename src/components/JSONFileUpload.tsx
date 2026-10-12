import { notify } from "@components/Notification";
import { cn } from "@utils/helpers";
import { FileJson2 } from "lucide-react";
import * as React from "react";
import { useState } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export const JSONFileUpload = ({ onChange }: Props) => {
  const [dragActive, setDragActive] = React.useState(false);
  const [, setFileName] = useState("");

  const handleFileUpload = (files: FileList) => {
    if (files === null) return;

    // check if file is json
    if (files[0].type !== "application/json") {
      notify({
        title: "You uploaded the wrong file type",
        description: "Please upload a JSON file",
        icon: <FileJson2 size={20} />,
        backgroundColor: "bg-red-500",
      });
      return;
    }

    setFileName(files[0].name);

    const fileReader = new FileReader();
    fileReader.readAsText(files[0], "UTF-8");
    fileReader.onload = (e) => {
      if (e.target === null) return;
      onChange(e.target.result as string);
      notify({
        title: "Google Workspace",
        description: "You successfully uploaded your service account key",
        icon: <FileJson2 size={16} />,
      });
    };
  };

  const handleDrag = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const inputRef = React.useRef<HTMLInputElement>(null);

  const triggerUpload = () => {
    if (inputRef.current === null) return;
    inputRef.current.click();
  };

  return (
    <div
      className={cn(
        " flex gap-5 border border-dashed hover:border-nb-gray-600/50 rounded-md border-nb-gray-600/40 items-center justify-center group/upload",
        "bg-nb-gray-930/50 hover:bg-nb-gray-930/40 cursor-pointer transition-all px-4 pb-8 pt-6",
        dragActive && "border-nb-gray-600/80 hover:border-nb-gray-600/60",
        dragActive && "bg-nb-gray-900/40 hover:bg-nb-gray-930/50",
      )}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={triggerUpload}
    >
      <input
        type={"file"}
        className={"hidden"}
        onChange={(e) => {
          if (e.target.files === null) return;
          handleFileUpload(e.target.files);
        }}
        ref={inputRef}
        accept="application/JSON"
      />
      <div
        className={
          "bg-nb-gray-930 p-2.5 rounded-md mt-0.5 group-hover/upload:bg-nb-gray-930/80 transition-all"
        }
      >
        <FileJson2 size={20} className={"text-netbird"} />
      </div>

      <div>
        <p className={"text-[14px] font-medium text-nb-gray-100 "}>
          Upload your service account key (.json)
        </p>
        <p className={"text-xs !text-nb-gray-300 mt-1"}>
          <span
            className={
              "underline underline-offset-4 group-hover/upload:text-nb-gray-200 transition-all"
            }
          >
            Click to upload
          </span>{" "}
          or drag and drop your file here
        </p>
      </div>
    </div>
  );
};
