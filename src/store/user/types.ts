export interface User {
    id: string;
    email?: string;
    name: string;
    role: string;
    auto_groups: string[]
}

export interface FormUser extends User {
    autoGroupsNames: string[]
}

export interface UserToSave extends User
{
    groupsToCreate: string[]
}