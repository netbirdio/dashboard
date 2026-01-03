import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

export default function MicrosoftIcon(props: Readonly<IconProps>) {
  return (
    <svg
      viewBox="0 0 221 221"
      xmlns="http://www.w3.org/2000/svg"
      {...iconProperties(props)}
    >
      <path fill="#F1511B" d="M104.868 104.868H0V0h104.868z" />
      <path fill="#80CC28" d="M220.654 104.868H115.788V0h104.866z" />
      <path fill="#00ADEF" d="M104.865 220.695H0V115.828h104.865z" />
      <path fill="#FBBC09" d="M220.654 220.695H115.788V115.828h104.866z" />
    </svg>
  );
}