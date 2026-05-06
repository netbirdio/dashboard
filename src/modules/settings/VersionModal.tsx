import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import Separator from "@components/Separator";
import { Textarea } from "@components/Textarea";
import { useApiCall } from "@utils/api";
import loadConfig from "@utils/config";
import { trim } from "lodash";
import {
  DownloadIcon,
  PackageIcon,
  PlusCircle,
  SaveIcon,
  UploadIcon,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import type { PlatformType, ArchitectureType, VersionRelease } from "./VersionReleasesTab";
import { platformTypeLabels, architectureTypeLabels } from "./VersionReleasesTab";

const config = loadConfig();

type Props = {
  open: boolean;
  onClose: () => void;
  versionRelease?: VersionRelease | null;
};

export default function VersionModal({
  open,
  onClose,
  versionRelease,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const isEditing = !!versionRelease;

  const createRequest = useApiCall<VersionRelease>("/version-releases");
  const updateRequest = useApiCall<VersionRelease>(
    "/version-releases/" + versionRelease?.id,
  );
  const uploadRequest = useApiCall<{ id: string; filename: string; size: number }>("/version-releases/upload");

  const [version, setVersion] = useState(versionRelease?.version ?? "");
  const [platform, setPlatform] = useState<PlatformType>(versionRelease?.platform ?? "macos");
  const [architecture, setArchitecture] = useState<ArchitectureType>(versionRelease?.architecture ?? "amd64");
  const [downloadUrl, setDownloadUrl] = useState(versionRelease?.downloadUrl ?? "");
  const [description, setDescription] = useState(versionRelease?.description ?? "");
  const [isLatest, setIsLatest] = useState(versionRelease?.isLatest ?? false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  React.useEffect(() => {
    if (open) {
      setVersion(versionRelease?.version ?? "");
      setPlatform(versionRelease?.platform ?? "macos");
      setArchitecture(versionRelease?.architecture ?? "amd64");
      setDownloadUrl(versionRelease?.downloadUrl ?? "");
      setDescription(versionRelease?.description ?? "");
      setIsLatest(versionRelease?.isLatest ?? false);
      setSelectedFile(null);
      setUploadedFileId(null);
    }
  }, [open, versionRelease]);

  const isDisabled = useMemo(() => {
    const trimmedVersion = trim(version);
    const trimmedDownloadUrl = trim(downloadUrl);

    if (trimmedVersion.length === 0) return true;
    if (!selectedFile && !uploadedFileId && trimmedDownloadUrl.length === 0) return true;

    return false;
  }, [version, downloadUrl, selectedFile, uploadedFileId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const result = await uploadRequest.post(formData);
      if (result && result.id) {
        setUploadedFileId(result.id);
        // Ensure we have the correct full URL with /api prefix
        setDownloadUrl(config.apiOrigin + "/api/version-releases/files/" + result.id);
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const submit = async () => {
    let finalDownloadUrl = trim(downloadUrl);
    
    // if file was uploaded, use the file download URL
    if (uploadedFileId && !finalDownloadUrl) {
      finalDownloadUrl = config.apiOrigin + "/api/version-releases/files/" + uploadedFileId;
    }
    
    const payload: any = {
      version: trim(version),
      platform,
      architecture,
      downloadUrl: finalDownloadUrl,
      description: trim(description),
      isLatest,
    };

    if (isEditing) {
      notify({
        title: "更新中...",
        description: "正在更新版本信息...",
        promise: updateRequest.put(payload).then(() => {
          mutate("/version-releases");
          onClose();
        }),
        loadingMessage: "更新中...",
      });
    } else {
      notify({
        title: "创建中...",
        description: "正在创建新版本...",
        promise: createRequest.post(payload).then(() => {
          mutate("/version-releases");
          onClose();
        }),
        loadingMessage: "创建中...",
      });
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(state) => !state && onClose()}
      key={open ? 1 : 0}
    >
      <ModalContent maxWidthClass={"max-w-xl"}>
        <ModalHeader
          icon={<PackageIcon size={20} />}
          title={isEditing ? "编辑版本" : "添加版本"}
          description={isEditing ? "修改版本信息" : "发布新的安装包版本"}
          color={"netbird"}
        />

        <Separator />

        <div className={"px-8 py-6 flex flex-col gap-6"}>
          <div>
            <Label>版本号</Label>
            <HelpText>输入版本号，如 1.0.0</HelpText>
            <Input
              placeholder="1.0.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              customPrefix={<PackageIcon size={16} className="text-nb-gray-300" />}
            />
          </div>

          <div>
            <Label>平台</Label>
            <HelpText>选择目标平台</HelpText>
            <Select
              value={platform}
              onValueChange={(v) => {
                setPlatform(v as PlatformType);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择平台" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(platformTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <span>{label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>架构</Label>
            <HelpText>选择目标架构</HelpText>
            <Select
              value={architecture}
              onValueChange={(v) => {
                setArchitecture(v as ArchitectureType);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择架构" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(architectureTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <span>{label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>下载链接</Label>
            <HelpText>输入安装包的下载链接，或者上传文件</HelpText>
            <Input
              placeholder="https://example.com/download/installer.exe"
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              customPrefix={<DownloadIcon size={16} className="text-nb-gray-300" />}
            />
          </div>

          <div>
            <Label>或上传文件</Label>
            <HelpText>选择本地文件上传</HelpText>
            <div className="border border-dashed border-nb-gray-800 rounded-lg p-6 text-center">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              <label
                htmlFor="file-upload"
                className={`cursor-pointer flex flex-col items-center gap-2 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {isUploading ? (
                  <>
                    <div className="w-8 h-8 border-2 border-netbird border-t-transparent rounded-full animate-spin" />
                    <span className="text-nb-gray-400">上传中...</span>
                  </>
                ) : uploadedFileId ? (
                  <>
                    <UploadIcon size={32} className="text-netbird" />
                    <span className="text-nb-gray-400">已上传: {selectedFile?.name}</span>
                  </>
                ) : (
                  <>
                    <UploadIcon size={32} className="text-nb-gray-500" />
                    <span className="text-nb-gray-400">
                      {selectedFile ? selectedFile.name : "点击或拖拽文件到这里上传"}
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          <div>
            <Label>描述</Label>
            <HelpText>可选的版本描述信息</HelpText>
            <Textarea
              placeholder="更新内容、功能说明等..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div>
                <Label>设为最新版本</Label>
                <HelpText>将此版本标记为最新</HelpText>
              </div>
              <input
                type="checkbox"
                checked={isLatest}
                onChange={(e) => setIsLatest(e.target.checked)}
                className="w-5 h-5"
              />
            </div>
          </div>
        </div>

        <ModalFooter className={"items-center"}>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"}>取消</Button>
            </ModalClose>

            <Button
              variant={"primary"}
              onClick={submit}
              disabled={isDisabled}
            >
              {isEditing ? (
                <>
                  <SaveIcon size={16} />
                  保存修改
                </>
              ) : (
                <>
                  <PlusCircle size={16} />
                  添加版本
                </>
              )}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
