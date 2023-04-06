import { Group } from "../group/types";

export interface PolicyRule {
    id?: string
    name: string
    description: string
    enabled: boolean
    sources: Group[] | string[] | null
    destinations: Group[] | string[] | null
    flow: string
    action: string
    protocol: string
    ports: string[]
}

export interface Policy {
    id?: string
    name: string
    description: string
    enabled: boolean
    query: string
    rules: PolicyRule[]
};

export interface PolicyToSave extends Policy {
    sourcesNoId: string[],
    destinationsNoId: string[],
    groupsToSave: string[]
};
