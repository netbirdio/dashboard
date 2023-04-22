export interface User {
    id: string;
    email?: string;
    name: string;
    role: string;
    status: string;
    auto_groups: string[];
    is_current?: boolean;
    is_service_user?: boolean;
}

export interface FormUser extends User {
    autoGroupsNames: string[]
}

export interface UserToSave extends User {
    groupsToCreate: string[]
}
