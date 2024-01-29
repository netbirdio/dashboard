import { useMediaQuery } from "react-responsive";

export const useIsXs = () => {
  return useMediaQuery({ query: "(min-width: 490px)" });
};

export const useIsSm = () => {
  return useMediaQuery({ query: "(min-width: 640px)" });
};

export const useIsMd = () => {
  return useMediaQuery({ query: "(min-width: 768px)" });
};

export const useIsLg = () => {
  return useMediaQuery({ query: "(min-width: 1024px)" });
};

export const useIsXl = () => {
  return useMediaQuery({ query: "(min-width: 1280px)" });
};

export const useIs2xl = () => {
  return useMediaQuery({ query: "(min-width: 1536px)" });
};
