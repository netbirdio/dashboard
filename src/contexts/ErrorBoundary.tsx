import { notify } from "@components/Notification";
import { useDebounce } from "@hooks/useDebounce";
import { IconCircleX } from "@tabler/icons-react";
import { ErrorResponse } from "@utils/api";
import React, { useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
};

const ErrorBoundaryContext = React.createContext(
  {} as {
    setError: (error: ErrorResponse) => void;
    error: ErrorResponse | undefined;
  },
);

export default function ErrorBoundaryProvider({ children }: Props) {
  const [error, setError] = useState<ErrorResponse>();
  const errorDebounced = useDebounce(error, 300);

  useEffect(() => {
    if (errorDebounced) {
      const firstCharUpper = errorDebounced.message.charAt(0).toUpperCase();
      const message = firstCharUpper + errorDebounced.message.slice(1);
      notify({
        title: `Request failed with status code ${errorDebounced.code}`,
        description: "Error: " + message,
        icon: <IconCircleX size={24} />,
        backgroundColor: "bg-red-500",
        duration: 10000,
      });
      setError(undefined);
    }
  }, [errorDebounced]);

  return (
    <ErrorBoundaryContext.Provider value={{ setError, error }}>
      {children}
    </ErrorBoundaryContext.Provider>
  );
}

export const useErrorBoundary = () => {
  return React.useContext(ErrorBoundaryContext);
};
