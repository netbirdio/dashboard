import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

export default function OIDCIcon(props: Readonly<IconProps>) {
  return (
    <svg
      width="173"
      height="174"
      viewBox="0 0 173 174"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...iconProperties(props)}
    >
      <path
        d="M76.3945 173.48L103.325 154.065L102.072 0L76.3945 20.041V173.48Z"
        fill="#FF8E00"
      />
      <path
        d="M76.7077 173.48C-24.0221 157.466 -26.8926 69.7689 76.0814 50.7288L76.3945 68.8909C3.35034 81.0694 12.6045 146.598 76.3945 156.257L76.7077 173.48Z"
        fill="white"
      />
      <path
        d="M103.011 68.2646C115.468 68.3493 126.32 74.0515 137.144 79.8508L121.174 91.7502H172.216L172.529 56.9916L156.558 68.8909C140.397 60.7278 125.542 50.9315 103.011 50.7288V68.2646Z"
        fill="white"
      />
    </svg>
  );
}
