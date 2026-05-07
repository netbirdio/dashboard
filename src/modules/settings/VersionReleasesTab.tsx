import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { SelectDropdown, SelectOption } from "@components/select/SelectDropdown";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import * as Tabs from "@radix-ui/react-tabs";
import useFetchApi, { useApiCall } from "@utils/api";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  DownloadIcon,
  GlobeIcon,
  MoreVertical,
  PackageIcon,
  PlusCircle,
  Trash2,
  UploadIcon,
} from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useI18n } from "@/i18n/I18nProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import VersionModal from "./VersionModal";

// 定义平台类型
export type PlatformType = "macos" | "windows" | "linux" | "android";

// 定义架构类型
export type ArchitectureType = "amd64" | "arm64" | "armv7" | "universal";

// 平台图标
export const platformTypeLabels: Record<PlatformType, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  android: "Android",
};

// 架构标签
export const architectureTypeLabels: Record<ArchitectureType, string> = {
  amd64: "Intel / AMD64",
  arm64: "ARM64",
  armv7: "ARMv7",
  universal: "通用",
};

// 版本信息接口
export interface VersionRelease {
  id: string;
  version: string;
  platform: PlatformType;
  architecture: ArchitectureType;
  downloadUrl: string;
  description?: string;
  isLatest?: boolean;
  createdAt: string;
}

type ActionCellProps = {
  version: VersionRelease;
  onEdit: (version: VersionRelease) => void;
};

function ActionCell({ version, onEdit }: ActionCellProps) {
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();
  const { t } = useI18n();
  const deleteRequest = useApiCall<VersionRelease>("/version-releases/" + version.id);
  const { permission } = usePermissions();

  const handleDelete = async () => {
    const choice = await confirm({
      title: "删除版本",
      description: `确定要删除版本 ${version.version}(${platformTypeLabels[version.platform]})吗?`,
      confirmText: "删除",
      cancelText: "取消",
      type: "danger",
    });

    if (!choice) return;

    notify({
      title: "删除中...",
      description: "正在删除版本...",
      promise: deleteRequest.del().then(() => {
        mutate("/version-releases");
      }),
      loadingMessage: "删除中...",
    });
  };

  const handleDownload = () => {
    window.open(version.downloadUrl, "_blank");
  };

  return (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={handleDownload}>
        <DownloadIcon size={14} />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" className="p-2">
            <MoreVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => onEdit(version)}
          >
            <PackageIcon size={14} className="mr-2" />
            编辑
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-red-500 focus:text-red-500"
          >
            <Trash2 size={14} className="mr-2" />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function VersionReleasesTab() {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const { t } = useI18n();
  const { data: versions, isLoading } = useFetchApi<VersionRelease[]>(
    "/version-releases",
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editVersion, setEditVersion] = useState<VersionRelease | null>(null);

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort-version-releases",
    [
      {
        id: "createdAt",
        desc: true,
      },
    ],
  );

  const handleEdit = (version: VersionRelease) => {
    setEditVersion(version);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditVersion(null);
  };

  const columns: ColumnDef<VersionRelease>[] = [
    {
      accessorKey: "version",
      header: ({ column }) => (
        <DataTableHeader column={column}>版本号</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <PackageIcon size={16} className="text-nb-gray-400" />
          <span className="font-medium">{row.original.version}</span>
          {row.original.isLatest && (
        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Latest</span>
      )}
        </div>
      ),
    },
    {
      accessorKey: "platform",
      header: ({ column }) => (
        <DataTableHeader column={column}>平台</DataTableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-nb-gray-400">{platformTypeLabels[row.original.platform]}</span>
      ),
    },
    {
      accessorKey: "architecture",
      header: ({ column }) => (
        <DataTableHeader column={column}>架构</DataTableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-nb-gray-400">{architectureTypeLabels[row.original.architecture] || row.original.architecture}</span>
      ),
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableHeader column={column}>描述</DataTableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-nb-gray-400">{row.original.description}</span>
      ),
    },
    {
      id: "createdAt",
      header: ({ column }) => (
        <DataTableHeader column={column}>发布时间</DataTableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-nb-gray-400">
        {new Date(row.original.createdAt).toLocaleString("zh-CN")}
        </span>
      ),
    },
    {
      id: "actions",
      accessorKey: "id",
      header: "",
      cell: ({ row }) => (
        <ActionCell version={row.original} onEdit={handleEdit} />
      ),
    },
  ];

  return (
    <Tabs.Content value={"version-releases"} className={"w-full"}>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label="设置"
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=version-releases"}
            label="版本发布"
            icon={<GlobeIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <div className={"flex items-start justify-between"}>
          <div>
            <h1>版本发布</h1>
            <Paragraph>管理和发布各平台安装包，提供下载链接</Paragraph>
          </div>
        </div>
      </div>

      <VersionModal
        open={modalOpen}
        key={modalOpen ? 1 : 0}
        onClose={handleCloseModal}
        versionRelease={editVersion}
      />

      <DataTable
        isLoading={isLoading}
        text="版本发布"
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={versions}
        onRowClick={(row) => handleEdit(row.original)}
        searchPlaceholder="搜索版本号"
        getStartedCard={
          <GetStartedTest
            icon={
              <SquareIcon
                icon={<PackageIcon size={20} />}
                color={"gray"}
                size={"large"}
              />
            }
            title="暂无版本"
            description="开始发布您的第一个版本"
            button={
              <Button
                variant={"primary"}
                onClick={() => setModalOpen(true)}
              >
                <PlusCircle size={16} />
                添加版本
              </Button>
            }
          />
        }
        rightSide={() => (
          <>
            {versions && versions.length > 0 && (
              <Button
                variant={"primary"}
                className={"ml-auto"}
                onClick={() => setModalOpen(true)}
              >
                <PlusCircle size={16} />
                添加版本
              </Button>
            )}
          </>
        )}
      >
        {(table) => (
          <>
            <DataTableRowsPerPage
              table={table}
              disabled={!versions || versions.length === 0}
            />
            <DataTableRefreshButton
              isDisabled={!versions || versions.length === 0}
              onClick={() => mutate("/version-releases")}
            />
          </>
        )}
      </DataTable>
    </Tabs.Content>
  );
}
