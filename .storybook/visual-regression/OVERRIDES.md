# Look overrides of shared components

Where `src/` overrides how a shared component looks: colour, background, border, shadow,
opacity or ring classes passed into a component from `src/components/**`, inline style
colours, and hard-coded hex/rgb values in TSX. These places don't follow the component's
tokens, so the component stories can't vouch for them. They need a page story that
renders the actual route and state.

How the list was built:

- `git diff e9aae3d1 -- src`, keeping the added or removed lines that touch colour classes
  or literals (section A).
- A scan of every `.tsx` outside `src/components` and `src/stories` for opening tags of
  shared components whose class props (`className`, `contentClassName`, `iconClass`, …)
  carry colour classes (section B). The scan also catches colour classes on an element
  passed as a prop, such as `icon={<X className="fill-netbird"/>}`. Those entries are
  marked *(icon)*.
- A grep for hex/rgb literals, arbitrary `bg-[#…]` classes and inline `style` colours
  (section C).

Line numbers refer to the working tree. **Δ** means the line changed on this branch.
Coverage marks: **C** = covered by a component story (`Components/…`), **P** = needs a
page story (listed in section D).

## A. Changed on this branch (priority)

### Layout, on every dashboard route

| file:line | component | override | where visible | cov |
|---|---|---|---|---|
| layouts/Header.tsx:38 Δ | header bar | `bg-white dark:bg-nb-gray` → `bg-nb-gray` | every route, header | P |
| layouts/Header.tsx:97 Δ | header icon link | `hover:text-white` → `hover:text-nb-gray-50` | every route, header link hover | P |
| layouts/Header.tsx:44 | Button (mobile nav) | `opacity-0` when restricted | narrow viewport only | – |
| layouts/Navigation.tsx:67 Δ | sidebar | `bg-gray-50 dark:bg-nb-gray` → `bg-nb-gray` | every route, sidebar | P |
| layouts/DashboardLayout.tsx:75 Δ | mobile nav drawer | `bg-nb-gray-950` → `bg-nb-gray dark:bg-nb-gray-950` | narrow viewport, drawer open | – |
| contexts/ThemeProvider.tsx:118 Δ | react-loading-skeleton | hex base/highlight → `rgb(var(--skeleton-*))` | every loading skeleton | C (Skeletons/*) + P (loading states) |
| cloud/msp/MSPTenantsSwitcher.tsx:264 Δ, :133, :315 | tenant avatar, PopoverContent `shadow-nb-gray-950`, Badge `!border-yellow-600` | `initials-avatar` class added | cloud MSP header, switcher open | P (cloud) |

### Peers `/peers`, peer `/peer?id=`

| file:line | component | override | where visible | cov |
|---|---|---|---|---|
| modules/peers/PeerNameCell.tsx:34-36 Δ | name cell | `neutral-*` → `nb-gray-300`, `hover:text-nb-gray-100 hover:bg-nb-gray-900/60` | /peers rows, row hover | P |
| modules/peers/PeerAddressCell.tsx:57,68 Δ | address cell | `nb-gray-300` / `nb-gray-400` | /peers rows | P |
| modules/peers/PeerOSCell.tsx:29 Δ, PeerLastSeenCell.tsx:15 Δ, PeerVersionCell.tsx:55,80,98,117 Δ | cells + version FullTooltip | `neutral-*` → `nb-gray-*` | /peers rows, version tooltip, update-available state | P |
| modules/peers/PeerVersionCell.tsx:105 | FullTooltip | `text-nb-gray-100` | /peers version hover | P |
| modules/peers/PeerActionCell.tsx:202 Δ, :267 | Button `secondary` `!px-3 border={0}`, FullTooltip `!text-nb-gray-300` | – | /peers row action menu trigger | P |
| modules/peers/PeerMultiSelect.tsx:450 Δ | multi-select popup text | `text-white` → `text-nb-gray-100` | /peers with rows selected | P |
| modules/peers/PeersTable.tsx:560 Δ | Button group divider | removed `!border-l-0` | /peers toolbar | P |
| modules/peers/PeerConnectButton.tsx:66 Δ | connect button | `hover:text-white` → `hover:text-nb-gray-100` | unused (no importer) | – |
| app/(dashboard)/peer/page.tsx:260,762 Δ | icon buttons | `neutral-*` → `nb-gray-*` | /peer header edit / copy hover | P |
| app/(dashboard)/peer/page.tsx:617 | Card.ListItem | `border-nb-gray-800` | /peer information card | P |
| modules/peer/AddRouteDropdownButton.tsx:64,88 Δ, :79 | dropdown item text `text-white` → `text-nb-gray-100`, SquareIcon *(icon)* `fill-netbird` | /peer → Network Routes → "Add route" open | P |
| modules/peer/RemoteJobDropdownButton.tsx:56,76 Δ | dropdown/confirm text | `text-white` → `text-nb-gray-100` | /peer → Remote Jobs → dropdown open | P |
| modules/common-table-rows/ActiveInactiveRow.tsx:30, ExpirationDateRow.tsx:11, LastTimeRow.tsx:29-42 Δ | shared cells | `neutral-*` → `nb-gray-*` | /setup-keys, /team/users, /peers last seen + tooltip | P |

### Groups `/groups`, `/group?id=`

| file:line | component | override | where visible | cov |
|---|---|---|---|---|
| app/(dashboard)/group/page.tsx:118 Δ | icon button | `neutral-*` → `nb-gray-300` | /group header | P |
| modules/groups/table/GroupsNameCell.tsx:18 Δ | name cell | `text-neutral-300` → `text-nb-gray-300` | /groups rows | P |
| modules/groups/AssignPeerToGroupModal.tsx:232,241 Δ, :262 | ModalHeader, name cell, DataTable *(icon)* | `nb-gray-*` hover colours | /group → Peers → "Assign peers" modal | P |
| components/ui/MultipleGroups.tsx:84-125 Δ | GroupBadge / Badge | `group-hover:bg-gray-100 dark:group-hover:bg-nb-gray-800` | any table groups cell, row hover | C (Badge/GroupLists) + P (row hover) |
| components/ui/GroupBadgeWithEditPeers.tsx:87 Δ | small count badge | light/dark green pair | /group peers section | P |

### Access control `/access-control`

| file:line | component | override | where visible | cov |
|---|---|---|---|---|
| modules/access-control/table/AccessControlDirectionCell.tsx:30,38 Δ | arrow icons | `fill-green-500` → `fill-green-600 dark:fill-green-500`, sky likewise | /access-control rows | P |
| modules/access-control/AccessControlModal.tsx:330 Δ, :284, :469, :487 | help text `text-white` → `text-nb-gray-100`; ModalHeader *(icon)* `fill-netbird`; Callout *(icon)* `text-netbird` | policy modal, protocol section, SSH callouts | P |
| modules/access-control/ssh/SSHUsernameSelector.tsx:118 Δ | PopoverContent | `shadow-nb-gray-950` → `dark:shadow-nb-gray-950` | policy modal → SSH tab → username selector open | P |

### Events `/events/audit`

| file:line | component | override | where visible | cov |
|---|---|---|---|---|
| modules/activity/ActivityEntryRow.tsx:64,71-78,91,130,154 Δ | avatar, icon square, Card `bg-white dark:bg-nb-gray-925 border-…`, timeline line | light/dark pairs added | /events/audit list | P |
| modules/activity/ActivityEventCodeSelector.tsx:94 Δ | PopoverContent | `dark:shadow-nb-gray-950` | /events/audit type filter open | P |
| modules/activity/UsersDropdownSelector.tsx:117-154 Δ | avatar `#808080`, PopoverContent shadow | – | unused (no importer) | – |

### Team `/team/users`, `/team/user?id=`

| file:line | component | override | where visible | cov |
|---|---|---|---|---|
| modules/users/table-cells/UserNameCell.tsx:67,104 Δ | avatar `initials-avatar`, "You" badge sky pair | /team/users rows | P |
| modules/users/table-cells/ServiceUserNameCell.tsx:15 Δ | avatar `text-white` → `text-nb-gray-100` | /team/service-users | P |
| modules/users/table-cells/UserStatusCell.tsx:71 Δ | tooltip text | /team/users pending/blocked status hover | P |
| modules/users/UserInvitesTable.tsx:91-94 Δ, :368, :586, :607 | avatar inline style, Paragraph, DataTable/SquareIcon *(icon)* | /team/users → invites | P |
| modules/users/UserRoleSelector.tsx:340 Δ | PopoverContent shadow | /team/user role selector open | P |
| modules/users/HorizontalUsersStack.tsx:35,128-133 Δ | FullTooltip, avatar inline `getAvatarStyle` | PeerGroupSelector/MultipleGroups with users | C (Selectors) partly + P |
| modules/users/SmallUserAvatar.tsx:23-31 Δ | avatar, `#808080` fallback | UserSelector, users filter | C (Selectors/UserSelectorOpen, DataTable/FilterPickers) |
| app/(dashboard)/team/user/page.tsx:186-197 Δ | avatar `text-white` → `text-nb-gray-100`, `#808080` | /team/user?id= header | P |
| utils/avatar.ts Δ | inline `--avatar-*` vars from chroma mix | every initials avatar | P |

### Settings `/settings`

| file:line | component | override | where visible | cov |
|---|---|---|---|---|
| modules/settings/DangerZoneTab.tsx:86-95 Δ | Card `bg-red-50 border-red-300 dark:bg-red-950/50 dark:border-red-600`, `!text-red-*` | /settings?tab=danger-zone | P |
| modules/settings/GroupsSettings.tsx:93,304 Δ, :221, :276 | info box netbird pair, Input *(icon)* | /settings?tab=groups (JWT groups enabled) | P |
| modules/settings/ClientSettingsTab.tsx:278,352 Δ, :307 | version text, FancyToggleSwitch *(icon)* `text-yellow-400` | /settings?tab=clients | P |

### DNS `/dns/*`, networks `/networks`, `/network?id=`

| file:line | component | override | where visible | cov |
|---|---|---|---|---|
| modules/dns/nameservers/table/NameserverNameCell.tsx:14 Δ | name cell | /dns/nameservers rows | P |
| modules/dns/nameservers/NameserverTemplateModal.tsx:145 Δ | gradient `from-white to-nb-gray-200` → dark-prefixed | /dns/nameservers → "Add nameserver" template modal | P |
| modules/dns/zones/records/DNSRecord{Name,Content,TimeToLive}Cell.tsx Δ | cells | /dns/zones expanded zone rows | P |
| modules/networks/misc/NetworkInformationSquare.tsx:24,26 Δ | name block | /networks rows, /network header | P |
| modules/networks/resources/ResourceNameCell.tsx:38 Δ | name cell | /network?id= resources table | P |
| modules/networks/resources/NetworkResourceModal.tsx:387 Δ | text `text-white` → `text-sky-900 dark:text-white` | resource modal callout | P |

### Posture checks `/posture-checks`

| file:line | component | override | where visible | cov |
|---|---|---|---|---|
| modules/posture-checks/table/cells/PostureCheckChecksCell.tsx:35,66,92 Δ | check icons gradient `nb-gray-500/300` → `[#616E79]/[#7C8994]` | /posture-checks rows | P |
| modules/posture-checks/checks/PostureCheckOperatingSystem.tsx:67 Δ, PostureCheckProcess.tsx:44 Δ | SlidingTabs/PostureCheckCard `iconClass` hex gradient | posture check modal, check list | P |
| modules/posture-checks/ui/PostureCheckCard.tsx:72,98,132 Δ | icon `text-white`, enabled badge green pair | posture check modal | P |
| modules/posture-checks/checks/tooltips/*Tooltip.tsx Δ | FullTooltip content `text-nb-gray-300` (+ green/red) | /posture-checks checks cell hover | P |
| modules/posture-checks/ui/PostureCheckIcons.tsx:42 Δ | Windows icon `text-white` → `text-nb-gray-100` | OS check | P |

### Reverse proxy `/reverse-proxy/*`

| file:line | component | override | where visible | cov |
|---|---|---|---|---|
| modules/reverse-proxy/clusters/ClustersModal.tsx:425-434 Δ, :518 | text `text-sky-900 dark:text-white`, Code `!border-nb-gray-930` | /reverse-proxy/clusters → add cluster modal | P |
| modules/reverse-proxy/clusters/ClusterCloudDeploy.tsx:292 Δ | text | clusters modal, cloud deploy tab | P |
| modules/reverse-proxy/clusters/ClusterTypeIndicator.tsx:21-38 Δ, ClustersFeaturesCell.tsx:58-79 Δ | FullTooltip `text-nb-gray-100` | /reverse-proxy/clusters rows, tooltips | P |
| modules/reverse-proxy/targets/ReverseProxyTargetModal.tsx:262,339,358-373 Δ | ModalHeader *(icon)*, FancyToggleSwitch, mono text | services → target modal | P |
| modules/reverse-proxy/targets/ReverseProxyTargetSelector.tsx:94-137 Δ | help text | service modal, target type step | P |
| modules/reverse-proxy/ReverseProxyCrowdSecIPReputation.tsx:72 Δ | help text | service modal → access control | P |
| modules/reverse-proxy/events/ReverseProxyEvents{Request,Time,User}Cell.tsx Δ | cells, avatar | /reverse-proxy/logs rows | P |
| modules/reverse-proxy/table/ReverseProxyDestinationCell.tsx:20 Δ | cell | /reverse-proxy/services rows | P |

### Control center `/control-center`

| file:line | component | override | where visible | cov |
|---|---|---|---|---|
| app/(dashboard)/control-center/page.tsx:312 Δ, utils/canvas-theme.ts:13-17 Δ | ReactFlow `Background` `#181a1d`/`#717171` → theme helper | canvas background | P |
| edges/SmartEdge.tsx:32-139, DirectionIn.tsx:79-86, SimpleConnection.tsx:44-49, ConnectionLine.tsx:33, AnimatedLine.tsx:72-77 Δ | inline `stroke` hex → `rgb(var(--nb-gray-*))`, label colours | edges, enabled/disabled | P |
| nodes/Select{Group,Peer,User}Node.tsx Δ | inline `backgroundColor: #3f444b` → var; SelectDropdown `!bg-nb-gray-920 !text-nb-gray-300 hover:bg-nb-gray-925` | draft nodes, selector closed | P |
| header/ControlCenterHeader.tsx:112,157 Δ, :216-331 | Button `!bg-nb-gray-930`, SelectDropdown `!bg-nb-gray-920 …` | header toolbar | P |
| panels/{DestinationGroup,PeerGroups}Panel.tsx, draft/ControlCenterComponentsPanel.tsx Δ | kbd shadow `#1e2123` → var pair | side panels | P |
| panels/RoutingPeersBar.tsx:176,190,286 Δ, menus/{Canvas,Node}ContextMenu.tsx Δ | hover text, PopoverContent shadow | routing peers bar, context menus open | P |
| user/ControlCenterCurrentUserBadge.tsx:26,36 Δ | Button `!bg-nb-gray-930 !text-nb-gray-300`, avatar | unused (no importer) | – |

### Agent network `/agent-network/*`, onboarding, misc

| file:line | component | override | where visible | cov |
|---|---|---|---|---|
| modules/agent-network/AgentOverviewPanel.tsx:474-567 Δ | Chart.js axis/grid hex per theme | /agent-network/usage charts | P |
| modules/agent-network/AgentAccessLogTable.tsx:765,808,988 Δ | SquareIcon *(icon)*, divider border, avatar | /agent-network/usage logs | P |
| modules/agent-network/EndpointBadge.tsx:39,55 Δ | FeatureCard overridden `bg-nb-gray-800/60 border-nb-gray-700 !text-nb-gray-100 …` | /agent-network/connect, /providers | P |
| modules/onboarding/OnboardingDevices.tsx:96-165 Δ | `bg` prop `#1c1d21` → `rgb(var(--nb-gray-940))` | onboarding dialog devices step | P |
| modules/onboarding/{networks/OnboardingTestResource,p2p/OnboardingTestP2P}.tsx Δ | text `text-white` → `text-nb-gray-100` | onboarding test steps | P |
| modules/instance-setup/InstanceSetupWizard.tsx:173 Δ | countdown text | /setup | P |
| modules/remote-access/ssh/Terminal.tsx:9-33 Δ | xterm theme hex per theme | /peer/ssh | P |
| modules/remote-access/rdp/RDPCertificateModal.tsx:37,73,77 Δ | ModalHeader *(icon)*, text | /peer/rdp certificate prompt | P |
| app/invite/page.tsx:114-269 Δ | headings `text-white` → `dark:text-white text-nb-gray-900`, Paragraph/Input `text-nb-gray-400` | /invite all states | P |
| cloud/{distributor/table/CustomerNameCell,msp/table/TenantNameCell,msp/MSPTransferAccountModal}.tsx Δ | avatar `getAvatarStyle` inline style | /customers, /tenants, transfer modal | P (cloud) |
| cloud/traffic-events/table/TrafficEventsDetailRow.tsx:146 Δ | link hover `text-white` → `text-nb-gray-50` | /events/traffic expanded row | P (cloud) |

### Inside shared components (changed, part of the component's own look)

These ship with the component, so the component stories cover them directly.

| file:line | override | story |
|---|---|---|
| components/modal/Modal.tsx:73,138,182-186 Δ | content/sidebar border `nb-gray-600 dark:nb-gray-900` (sidebar dark was `zinc-700/40`); footer `bg-nb-gray-950 dark:bg-transparent -mb-6 pb-6` | Modal/* |
| components/ButtonGroup.tsx:15-44 Δ | border/divide `dark:nb-gray-800` (was `dark:border-nb-gray-900`), selected via `aria-pressed` | Button/Group |
| components/PeerGroupSelector.tsx:479,601 Δ | trigger `enabled:hover:*` hover, popover shadow | Selectors/GroupSelector (hover), GroupSelectorOpen |
| components/{PeerSelector,UserSelector,PortSelector,NetworkRouteSelector}.tsx Δ | popover `dark:shadow-nb-gray-950`, text `nb-gray-100` | Selectors/*Open |
| components/select/SelectDropdown.tsx:233 Δ | popover shadow | Select/SelectDropdownOpen |
| components/table/{TableFilters,DataTableRowsPerPage,DataTableFilter,filters/*}.tsx Δ | chip, popover, picker hover colours | DataTable/WithFilters, FilterPopoverOpen, RowsPerPageOpen, FilterPickers |
| components/table/Table.tsx:107,131 Δ | row hover, header bg | DataTable/Default (hover) |
| components/Notification.tsx:200-207 Δ | icon square colours | Notification/Variants |
| components/Steps.tsx:78-104 Δ | line/circle colours | Code/StepList |
| components/PinCodeInput.tsx:111 Δ | `bg-nb-gray-900 border-nb-gray-700` | Input/Specialised, PinCodeFocus |
| components/RadioGroup.tsx:49-51 Δ | green/red checked pairs | Toggles/Radios |
| components/ui/{SmallBadge,LoginExpiredBadge,UserAvatar,TruncatedText,GetStartedTest}.tsx Δ | variant pairs, avatar | Badge/Small, Icons/LogoAndAvatar, Popover/TruncatedTextOpen, EmptyStates/GetStartedCards |
| components/ui/DarkModeToggle.tsx Δ | rewritten as segmented row | DropdownMenu/ThemeToggle, UserDropdownOpen (expected diff) |
| components/ui/AnnouncementBanner.tsx:14-33 Δ | variant pairs | none: needs an announcement fixture; P (layout with banner) |
| components/Command.tsx:120 Δ | item selected bg | Modal/CommandPalette |
| components/DatePickerWithRange.tsx:223 Δ | active preset | Select/DateRangeOpen |

## B. Pre-existing overrides (unchanged on this branch)

Grouped by pattern. Every one renders on a page, so page stories cover them; the
component stories only show the default look.

| pattern | where (file:line) | where visible | cov |
|---|---|---|---|
| DataTable `rowClassName`/wrapper `bg-nb-gray-960` (expanded sub-tables) | routes/RouteTable.tsx:163, dns/zones/records/DNSRecordsTable.tsx:66, dns/zones/table/DNSZonesTable.tsx:207, reverse-proxy/table/ReverseProxyTable.tsx:180-206, reverse-proxy/targets/ReverseProxyTargetsTable.tsx:73 | /network-routes expanded group, /dns/zones expanded, /reverse-proxy/services expanded | P |
| DataTable rows `opacity-50` (disabled rows) | reverse-proxy/table/ReverseProxyTable.tsx:180, targets/flat/ReverseProxyFlatTargetsTable.tsx:205 | disabled service / target rows | P |
| PopoverContent `shadow-nb-gray-950` (no `dark:` prefix) | cloud/traffic-events/TrafficEventsFilter.tsx:251, agent-network/AgentBudgetRuleModal.tsx:435, AgentPolicyModal.tsx:619, control-center/panels/RoutingPeersBar.tsx:190, cloud/msp/MSPTenantsSwitcher.tsx:133 | those popovers open | P |
| PopoverContent `dark:bg-nb-gray-935 dark:border-nb-gray-910` | control-center/draft/DraftStartPopover.tsx:43 | /control-center draft popover | P |
| DialogContent `bg-nb-gray-950` | cloud/aws/AWSChoosePlan.tsx:90, onboarding/Onboarding.tsx:301, onboarding/agent-network/AgentNetworkOnboarding.tsx:128 | onboarding dialogs, AWS plan dialog | P |
| Card `bg-nb-gray-935/940 border-nb-gray-910/920` | cloud/notifications/{NotificationEventTypes:113,NotificationTab:70,channels/*:112-113} | /settings?tab=notifications (cloud) | P (cloud) |
| Card status colours | app/(dashboard)/network/page.tsx:287,332 | /network?id= header | P |
| Button `!bg`/`!text`/`disabled:!bg-*`/`opacity-*` | billing/trial/TrialOrUpgradeButton.tsx:97, billing/PlanCard.tsx:196, control-center/draft/DraftModeSwitcher.tsx:107, control-center/nodes/{PeerNode:104,StandaloneResourceNode:79}, cloud/msp/MSPTenantPermissionsTab.tsx:153 | trial button (cloud header), /plans, /control-center draft, MSP permissions | P |
| SegmentedTabs `bg-nb-gray-930` / trigger `bg-nb-gray-900/50` | control-center/draft/DraftModeSwitcher.tsx:43-56, control-center/header/FlowSelector.tsx:74 | /control-center header | P |
| SelectDropdown `!bg-nb-gray-920 !text-nb-gray-300` | control-center/header/FlowSelector.tsx:55, draft/modals/DraftResourceNetworkModal.tsx:181 | /control-center | P |
| Badge `hover:bg-nb-gray-910/930`, `opacity-30` | networks/resources/{ResourceExposeServiceCell:39,ResourcePolicyCell:50}, peer/PeerSSHToggle.tsx:281, posture-checks/table/cells/PostureCheckPolicyUsageCell.tsx:83, reverse-proxy/table/{ReverseProxyAccessControlCell:64,ReverseProxyAuthCell:119}, groups/table/GroupsCountCell.tsx:43, route-group/GroupedRouteHighAvailabilityCell.tsx:93 | row badge hover / empty counts | P |
| FullTooltip trigger restyled (`border-nb-gray-800 hover:bg-nb-gray-900 opacity-0→100`) | networks/resources/ResourcePolicyCell.tsx:83, peer/PeerSSHToggle.tsx:227, posture-checks/table/cells/PostureCheckPolicyUsageCell.tsx:28 | row hover reveals button | P (row hover) |
| FullTooltip `!border-nb-gray-800 from-nb-gray-920 to-nb-gray-900` | billing/locked-feature/LockedFeatureTooltip.tsx:23 | locked-feature badge hover (cloud) | P |
| FeatureCard `bg-nb-gray-900/20 hover:bg-nb-gray-900/40` | app/(dashboard)/agent-network/providers/page.tsx:35 | /agent-network/providers | P |
| FancyToggleSwitch `hover:bg-nb-gray-930` | cloud/notifications/NotificationEventTypes.tsx:121 | notifications tab | P (cloud) |
| DeviceCard `opacity-40/60` | control-center/nodes/{PeerNode:189,ResourceNode:159}, reverse-proxy/targets/ReverseProxyTargetDevice.tsx:85 | disabled nodes / targets | P |
| InlineLink `!text-netbird-500` / `!text-nb-gray-200` | integrations/idp-sync/{IdentityProviderTab:90,okta-scim/OktaSetup:617-626}, onboarding/{Onboarding:592,agent-network/AgentNetworkOnboarding:219} | /integrations IdP tab, onboarding | P |
| HelpText / Paragraph / Callout text colour (`orange`, `yellow-400`) | agent-network/AIProviderModal.tsx:1730, reverse-proxy/ReverseProxyModal.tsx:647, cloud/webhooks/WebhookHeadersTabContent.tsx:66 | those modals | P |
| DropdownMenuItem `text-red-500 focus:text-red-500` (instead of `variant="danger"`) | settings/IdentityProvidersTab.tsx:106 | /settings?tab=identity-providers row menu | P |
| *(icon)* colour classes on icons passed into ModalHeader / SquareIcon / NoResults / DataTable `getStartedCard` / Input prefix / Callout | ~150 entries, e.g. `fill-netbird` in every create modal header, `fill-nb-gray-200` in every table empty state | modal headers, empty tables | C for the components; P for empty states (`parameters.api: { "GET /x": [] }`) |

## C. Hard-coded colours (hex / rgb / inline style)

| file:line | value | where visible | cov |
|---|---|---|---|
| modules/remote-access/ssh/Terminal.tsx:9-19 Δ | xterm themes `#181a1d`, `#e4e7e9`, `#3a3f44` | /peer/ssh | P |
| modules/agent-network/AgentOverviewPanel.tsx:474-475 Δ | chart axis `#9ca3af`, grid `rgba(255,255,255,0.04)` | /agent-network/usage | P |
| modules/control-center/edges/*.tsx Δ | `#0e9f6e` enabled, `#0ea5e9` (still literal) | /control-center edges | P |
| modules/control-center/utils/canvas-theme.ts:17 Δ | dark dots `#717171` | /control-center | P |
| modules/users/SmallUserAvatar.tsx:30, activity/UsersDropdownSelector.tsx:121, app/(dashboard)/team/user/page.tsx:197 | `#808080` system-user avatar | user selector, /team/user | C partly + P |
| utils/avatar.ts:18-19 Δ | `#ffffff` / `#000000` avatar foreground | all initials avatars | P |
| modules/posture-checks/** Δ | `from-[#616E79] to-[#7C8994]` | /posture-checks | P |
| modules/billing/{PlanIcon:24,trial/TrialGradientCard:17} | `from-[#6697FF] to-[#CE8EE3]` | /plans, trial card (cloud) | P (cloud) |
| modules/reverse-proxy/clusters/ClustersModal.tsx:69 | Docker `fill-[#2496ED]` | clusters modal | P |
| modules/agent-network/AIProviderLogo.tsx:92-101, data/providerLogos.ts | provider brand inks | /agent-network/providers | P |
| layouts/AppLayout.tsx:51 | `style={{ colorScheme: "dark" }}` on the app root | every route; native controls/scrollbars stay dark | P (note: ignores light mode) |
| src/assets/icons/*.tsx | brand icon fills | integrations, IdP lists | – (brand colours, theme-independent) |

## D. Coverage

**Covered by component stories (`Components/…`):** every row marked C above, plus all
of "Inside shared components". The component stories render every shared component in
dark mode with its default classes, so if a section A/B row breaks, the
component's own look is ruled out first.

**Routes and states page stories must cover** for the rows marked P (dark mode;
`cloud` tag where noted):

1. Layout on any route: header (incl. icon-link hover), sidebar, user dropdown open,
   help dropdown open, a loading skeleton state; cloud: MSP tenant switcher open,
   trial/upgrade button.
2. `/peers`: table with update-available versions, login-expired peer, row hover,
   version tooltip, last-seen tooltip, row action menu open, rows selected (multi-select popup),
   empty state.
3. `/peer?id=`: header + information card, Network Routes section with "Add route"
   dropdown open, Remote Jobs dropdown open, SSH toggle callouts.
4. `/groups` rows; `/group?id=` header, peers section, "Assign peers" modal open.
5. `/access-control`: rows with in/out/bi directions; policy modal (protocol section, SSH tab
   with username selector open).
6. `/events/audit`: entries with each icon colour and avatars; event-type filter open.
   Cloud: `/events/traffic` expanded detail row.
7. `/team/users`: rows incl. "You" badge, pending/blocked status tooltip, invites table;
   `/team/service-users`; `/team/user?id=` header + role selector open.
8. `/settings`: tabs danger-zone, groups (JWT enabled info box), clients,
   identity-providers row menu; cloud: notifications.
9. `/dns/nameservers` rows + template modal; `/dns/zones` with an expanded zone (records sub-table).
10. `/networks` rows; `/network?id=` header, resources table, resource modal;
    `/network-routes` with an expanded group (sub-table `bg-nb-gray-960`).
11. `/posture-checks`: rows with check icons + tooltips hover; posture check modal (OS / process cards).
12. `/reverse-proxy/services` (expanded row, disabled service, service modal: target step,
    access control CrowdSec section, target modal), `/reverse-proxy/clusters` (rows, tooltips,
    add-cluster modal incl. cloud deploy tab), `/reverse-proxy/logs` rows.
13. `/control-center`: canvas with enabled and disabled edges, draft mode (header switcher,
    draft popover, select nodes), routing peers bar popover, context menu open.
14. `/agent-network/usage` (charts, access logs), `/connect` and `/providers` (EndpointBadge,
    provider cards), budget/policy modals with popovers open.
15. Onboarding dialog (devices step, test resource/P2P steps), `/setup` wizard, `/invite` (all
    states), `/peer/ssh` terminal, `/peer/rdp` certificate prompt.
16. Cloud: `/customers`, `/tenants` (avatars), `/plans` (plan icons), MSP transfer modal,
    AWS plan dialog.
17. Announcement banner: needs an `announcements.json` fixture with each variant (the mock
    currently answers `[]`, so no story shows it).
