import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

export default function UsageLogsIcon(props: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      {...iconProperties(props)}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2Zm1 3.75v1.5h6v-1.5H5Zm0 3.5v1.5h6v-1.5H5Zm0 3.5v1.5h3.5v-1.5H5Z"
      />
    </svg>
  );
}
