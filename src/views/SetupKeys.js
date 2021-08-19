import React, {useEffect, useState} from "react";
import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import Loading from "../components/Loading";
import Highlight from "../components/Highlight";
import {getSetupKeys} from "../api/ManagementAPI";

export const SetupKeysComponent = () => {

  const [setupKeys, setSetupKeys] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const {
    getAccessTokenSilently,
  } = useAuth0();

  const handleError = error => {
    console.error('Error to fetch data:', error);
    setLoading(false)
    setError(error);
  };

  useEffect(() => {
    getSetupKeys(getAccessTokenSilently)
        .then(responseData => setSetupKeys(responseData))
        .then(() => setLoading(false))
        .catch(error => handleError(error))
  }, [getAccessTokenSilently])

  return (
      <>
        {loading && (
            <Loading/>
        )}
        {error != null && (
            <div className="result-block-container">
              <span>{error.toString()}</span>
            </div>
        )}
        <div className="result-block-container">
          {setupKeys && (
              <div className="result-block" data-testid="api-result">
                <h6 className="muted">Result</h6>
                <Highlight>
                  <span>{JSON.stringify(setupKeys, null, 2)}</span>
                </Highlight>
              </div>
          )}
        </div>
      </>
  );
}
;

export default withAuthenticationRequired(SetupKeysComponent,
{
  onRedirecting: () => <Loading/>,
}
);
