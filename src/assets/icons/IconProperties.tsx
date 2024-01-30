export type IconProps = {
  size?: 16 | 32 | 44 | 128 | 256 | 512 | number;
  className?: string;
  autoHeight?: boolean;
};

export const defaultIconProps: IconProps = {
  size: 16,
  className:
    "dark:fill-nb-gray-400 fill-gray-500 peer-data-[active=true]/icon:dark:fill-white peer-data-[active=true]/icon:fill-gray-900 shrink-0",
  autoHeight: false,
};

export const iconProperties = (props: IconProps) => {
  return {
    className: props.className ? props.className : defaultIconProps.className,
    style: {
      width: props.size ? `${props.size}px` : `${defaultIconProps.size}px`,
      height: props.autoHeight
        ? "auto"
        : props.size
        ? `${props.size}px`
        : `${defaultIconProps.size}px`,
    },
  };
};
