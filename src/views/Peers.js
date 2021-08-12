import React, {useEffect, useState} from "react";
import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import {getConfig} from "../config";
import Loading from "../components/Loading";
import TableOptionsButton from "../components/TableOptionsButton";
import {Dropdown, Table} from "react-bootstrap";
import {NavLink as RouterNavLink} from "react-router-dom";

export const PeersComponent = () => {
  const {apiOrigin, audience} = getConfig();

  const [peers, setPeers] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const {
    getAccessTokenSilently,
    loginWithPopup,
    getAccessTokenWithPopup,
  } = useAuth0();

  const handleError = error => {
    console.error('Error to fetch data:', error);
    setLoading(false)
    setError(error);
  };

  const handleConsent = async () => {
    try {
      await getAccessTokenWithPopup();
      setError(null)
    } catch (error) {
      handleError(error)
    }

    await callApi();
  };

  const handleLoginAgain = async () => {
    try {
      await loginWithPopup();
      setError(null)
    } catch (error) {
      handleError(error)
    }

    await callApi();
  };

  const callApi = async () => {
    try {
      const token = await getAccessTokenSilently();

      const response = await fetch(`${apiOrigin}/api/peers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseData = await response.json();

      setPeers(responseData)
      setLoading(false)
    } catch (error) {
      handleError(error)
    }
  };

  const handle = (e, fn) => {
    e.preventDefault();
    fn();
  };

  useEffect(() => {
    callApi()
  }, [])

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
          {peers && (
              <div>
                <h4>Peers</h4>
                <br/>
                <Table responsive>
                  <thead style={{fontSize: "13px", color: "#838383"}}>
                  <tr>
                    <th>PEER</th>
                    <th>IP</th>
                    <th>Status</th>
                    <th>OS</th>
                    <th>LAST SEEN</th>
                    <th/>
                  </tr>
                  </thead>
                  <tbody>
                  {Array.from(peers).map((peer, index) => (
                      <tr style={{color: "black"}}>
                        <td>
                          {peer.Name}
                        </td>
                        <td>
                          {peer.IP}
                        </td>
                        <td>
                          {peer.Connected ? "Connected" : "Disconnected"}
                        </td>
                        <td>
                          {peer.Os}
                        </td>
                        <td>
                          {!peer.Connected ? new Intl.DateTimeFormat('en-GB', {dateStyle: 'medium'}).format((Date.parse(peer.LastSeen))) : "Just now"}
                        </td>
                        <td>
                          <Dropdown>
                            <Dropdown.Toggle as={TableOptionsButton} id="peer-table-dropdown"/>
                            <Dropdown.Menu>
                              <Dropdown.Item eventKey="1">
                                <RouterNavLink
                                    to={"/peers/" + peer.IP}
                                    exact
                                >
                                  Edit
                                </RouterNavLink>
                              </Dropdown.Item>
                              <Dropdown.Item eventKey="2">Disable</Dropdown.Item>
                              <Dropdown.Item eventKey="3">Remove</Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                      </tr>
                  ))}
                  </tbody>
                </Table>
              </div>
          )}
        </div>
      </>
  );
}
;

export default withAuthenticationRequired(PeersComponent,
{
  onRedirecting: () => <Loading/>,
}
);
