import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

export default function SetupKeysIcon(props: IconProps) {
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
        d="M5.66187 0C8.80213 0 11.3216 2.51947 11.3216 5.65973C11.3216 6.37867 11.1915 7.0336 10.9611 7.65653L15.968 12.6635V16L12.6635 15.968V14.0053L10.6667 13.9733V12.0107L8.66987 11.9787L7.65653 10.9653C7.03573 11.1936 6.3488 11.3579 5.65973 11.3259C2.51947 11.3259 0 8.8064 0 5.66613C0.00213333 2.51947 2.5216 0 5.66187 0ZM4.32 2.6496C3.4048 2.6496 2.65173 3.40267 2.65173 4.31787C2.65173 5.23307 3.4048 5.98613 4.32 5.98613C5.2352 5.98613 5.98827 5.23307 5.98827 4.31787C5.98827 3.40267 5.2352 2.6496 4.32 2.6496Z"
      />
    </svg>
  );
}
