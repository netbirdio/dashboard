import { ApiClient } from './api-client';
import {getConfig} from "../../config";

const {apiOrigin} = getConfig();

const apiClient = new ApiClient({
  urlBase: `${apiOrigin}`
});

export { apiClient };
