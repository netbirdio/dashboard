import {ExpiresInValue} from "../../views/ExpiresInInput";

export interface Account {
    id: string;
    settings: { peer_login_expiration_enabled: boolean, peer_login_expiration: number}
}

export interface FormAccount extends Account {
    peer_login_expiration_enabled: boolean
    peer_login_expiration_formatted : ExpiresInValue
}