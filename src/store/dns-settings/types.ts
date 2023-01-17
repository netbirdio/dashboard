export interface DNSSettings {
    disabled_management_groups:  string[]
}

export interface DNSSettingsToSave extends DNSSettings
{
    groupsToCreate: string[]
}