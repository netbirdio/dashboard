import React, { useEffect, useState } from "react";
import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import Loading from "../components/Loading";
import { deletePeer, getPeers } from "../api/ManagementAPI";
import { timeAgo } from "../utils/common";
import EditButton from "../components/EditButton";
import CopyText from "../components/CopyText";
import DeleteModal from "../components/DeleteDialog";
import EmptyPeersPanel from "../components/EmptyPeers";

export const Users = () => {
    return (
        <div> HELLO </div>
    )
}

export default withAuthenticationRequired(Users, {
	onRedirecting: () => <Loading />,
});
