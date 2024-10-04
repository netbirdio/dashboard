import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { useReducer } from "react";
import { useSWRConfig } from "swr";
import { PostureCheck } from "@/interfaces/PostureCheck";
import {
  validateLocationCheck,
  validateOSCheck,
} from "@/modules/posture-checks/helper/PostureCheckHelper";

// Posture Check Reducer Type
type PostureCheckReducerType = {
  state: PostureCheck;
  action: any;
};

interface PostureCheckAction {
  type:
    | "name"
    | "description"
    | "version"
    | "location"
    | "os"
    | "network_range"
    | "process_check";
  payload: any;
}

const postureCheckReducer = (
  state: PostureCheck,
  action: PostureCheckAction,
): PostureCheck => {
  switch (action.type) {
    case "name":
      return { ...state, name: action.payload };
    case "description":
      return { ...state, description: action.payload };
    case "version":
      return {
        ...state,
        checks: {
          ...state.checks,
          nb_version_check: action.payload,
        },
      };
    case "location":
      return {
        ...state,
        checks: {
          ...state.checks,
          geo_location_check: validateLocationCheck(action.payload),
        },
      };

    case "os":
      return {
        ...state,
        checks: {
          ...state.checks,
          os_version_check: validateOSCheck(action.payload),
        },
      };

    case "network_range":
      return {
        ...state,
        checks: {
          ...state.checks,
          peer_network_range_check: action.payload,
        },
      };

    case "process_check":
      return {
        ...state,
        checks: {
          ...state.checks,
          process_check: action.payload,
        },
      };

    default:
      return state;
  }
};

type Props = {
  postureCheck?: PostureCheck;
  onSuccess?: (check: PostureCheck) => void;
};
export const usePostureCheck = ({ postureCheck, onSuccess }: Props = {}) => {
  const postureCheckRequest = useApiCall<PostureCheck>("/posture-checks", true);
  const { mutate } = useSWRConfig();
  const [state, dispatch] = useReducer(
    postureCheckReducer,
    postureCheck || {
      id: "",
      name: "",
      description: "",
      checks: {
        nb_version_check: undefined,
        geo_location_check: undefined,
        os_version_check: undefined,
        peer_network_range_check: undefined,
      },
    },
  );

  const updateOrCreate = (check: PostureCheck): Promise<PostureCheck> => {
    const hasID = check?.id !== "" && check?.id !== undefined;
    const withoutID = { ...check, id: undefined };
    return !hasID
      ? postureCheckRequest.post(withoutID)
      : postureCheckRequest.put(check, `/${check.id}`);
  };

  const updateOrCreateAndNotify = async (
    checkToUpdateOrCreate?: PostureCheck,
  ) => {
    const call = () => updateOrCreate(checkToUpdateOrCreate || state);
    let response = undefined;
    notify({
      title: `Posture Check ${state.name}`,
      description: `Posture Check was ${
        postureCheck ? "updated" : "created"
      } successfully.`,
      loadingMessage: `${
        postureCheck ? "Updating" : "Creating"
      } your posture check...`,
      promise: call().then((check) => {
        mutate("/posture-checks");
        onSuccess && onSuccess(check);
        response = check;
      }),
    });
    if (response === undefined) {
      return Promise.reject("Failed to create or update posture check");
    } else {
      return Promise.resolve(response);
    }
  };

  return { state, dispatch, updateOrCreateAndNotify, updateOrCreate };
};
