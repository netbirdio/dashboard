import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

export default function ShellIcon(props: IconProps) {
  return (
    <svg
      width="16"
      height="14"
      viewBox="0 0 16 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...iconProperties(props)}
    >
      <rect x="0.464844" y="0.5" width="15.2941" height="13" rx="2" />
      <line
        x1="5.0625"
        y1="9.69141"
        x2="11.1801"
        y2="9.69141"
        className={"dark:stroke-black stroke-white"}
        strokeWidth="1.5"
      />
      <path
        d="M2.76172 2.79688L5.43819 5.09099L2.76172 7.76746"
        className={"dark:stroke-black stroke-white"}
        strokeWidth="1.5"
      />
    </svg>
  );
}
