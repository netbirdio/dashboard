import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

export default function OpenCodeIcon(props: Readonly<IconProps>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      {...iconProperties(props)}
    >
      <path d="M22 24H2V0h20zM17 4.8H7v14.4h10z" />
    </svg>
  );
}
