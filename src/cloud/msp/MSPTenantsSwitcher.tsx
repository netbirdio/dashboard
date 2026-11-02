import Badge from "@components/Badge";
import Button from "@components/Button";
import { DropdownInfoText } from "@components/DropdownInfoText";
import { DropdownInput } from "@components/DropdownInput";
import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { SmallBadge } from "@components/ui/SmallBadge";
import TruncatedText from "@components/ui/TruncatedText";
import { VirtualScrollAreaList } from "@components/VirtualScrollAreaList";
import { useSearch } from "@hooks/useSearch";
import { cn, generateColorFromString } from "@utils/helpers";
import { ArrowUpRightIcon, ChevronsUpDown, CircleHelp } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useMSP } from "@/cloud/msp/contexts/MSPProvider";
import { useTenantSubscription } from "@/cloud/msp/hooks/useTenantSubscription";
import { TenantListItem } from "@/cloud/msp/interfaces/Tenant";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { useBilling } from "@/contexts/BillingProvider";

export const MSPTenantsSwitcher = () => {
  const { isTrial, isFreePlan } = useBilling();

  const {
    isActive,
    tenantListItems,
    isTenantListItemsLoading,
    currentAccount,
    mspAccount,
    isMspInfoLoading,
    isMSPInMSPContext,
    isMSPInTenantContext,
  } = useMSP();

  const showSwitcher = useMemo(() => {
    if (!mspAccount) return false;
    if (!isActive && isMSPInMSPContext) return false;
    if (isTenantListItemsLoading || isMspInfoLoading) return false;
    if (isMSPInTenantContext) return true;
    return isMSPInMSPContext && !isTrial && !isFreePlan;
  }, [
    isActive,
    isFreePlan,
    isMSPInMSPContext,
    isMSPInTenantContext,
    isMspInfoLoading,
    isTenantListItemsLoading,
    isTrial,
    mspAccount,
  ]);

  if (!showSwitcher) return;

  return (
    mspAccount &&
    tenantListItems &&
    tenantListItems?.length >= 1 && (
      <TenantDropdown
        tenants={tenantListItems}
        currentAccount={currentAccount}
        mspAccount={mspAccount}
      />
    )
  );
};

const searchPredicate = (item: TenantListItem, query: string) => {
  const lowerCaseQuery = query.toLowerCase();
  if (item.name.toLowerCase().includes(lowerCaseQuery)) return true;
  return item.domain.toLowerCase().includes(lowerCaseQuery);
};

type Props = {
  currentAccount?: TenantListItem;
  mspAccount: TenantListItem;
  tenants: TenantListItem[];
};

const TenantDropdown = ({ tenants, currentAccount, mspAccount }: Props) => {
  const { loginAs } = useMSP();
  const [open, setOpen] = useState(false);

  const [filteredItems, search, setSearch] = useSearch(
    tenants,
    searchPredicate,
    { filter: true, debounce: 150 },
  );

  const tenantListItems = useMemo(() => {
    // Remove current account from the list
    let items =
      filteredItems?.filter((i) => {
        return i.id !== currentAccount?.id;
      }) ?? [];

    // Add MSP account to the top of the list if user is in tenant context
    if (currentAccount) {
      items = [mspAccount, ...items];
    }

    return items;
  }, [filteredItems, currentAccount, mspAccount]);

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setTimeout(() => {
            setSearch("");
          }, 100);
        }
        setOpen(isOpen);
      }}
    >
      <div className={"relative h-10 left-2"}>
        <PopoverTrigger asChild>
          <Button
            className={"h-12 pr-3 pl-2 relative -top-[0.22rem]"}
            variant={"default-outline"}
          >
            <TenantItem
              tenant={currentAccount ?? mspAccount}
              isMSP={!currentAccount}
              selected={false}
            />
            <ChevronsUpDown size={16} className={"shrink-0 text-nb-gray-300"} />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        hideWhenDetached={false}
        className={cn(
          "w-full p-0 m-0 shadow-sm shadow-nb-gray-950",
          "w-[360px]",
        )}
        align="end"
        side={"top"}
        sideOffset={10}
        variant={"dark"}
      >
        <div className={"w-full"}>
          <DropdownInput
            value={search}
            onChange={setSearch}
            placeholder={"Search by name or domain..."}
            hideEnterIcon={true}
          />

          {tenantListItems.length == 0 && search == "" && (
            <div className={"max-w-xs mx-auto px-4"}>
              <DropdownInfoText>
                {"Seems like you don't have any customers."}
              </DropdownInfoText>
            </div>
          )}

          {tenantListItems.length == 0 && search != "" && (
            <div className={"max-w-xs mx-auto px-4"}>
              <DropdownInfoText>
                There are no customers matching your search. Try another search
                term.
              </DropdownInfoText>
            </div>
          )}

          {tenantListItems.length > 0 && (
            <VirtualScrollAreaList
              scrollAreaClassName={"py-0"}
              itemWrapperClassName={""}
              itemClassName={"dark:aria-selected:bg-nb-gray-920"}
              items={tenantListItems}
              onSelect={() => {
                return;
              }}
              estimatedItemHeight={56}
              maxHeight={340}
              renderItem={(option, selected) => {
                return (
                  <TenantItem
                    allowTrialExpiredInfo={true}
                    tenant={option}
                    isMSP={option.isMSP}
                    key={option.id}
                    onSelect={() => {
                      loginAs(option);
                      setOpen(false);
                    }}
                    selected={selected}
                  />
                );
              }}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

type TenantItemProps = {
  tenant: TenantListItem;
  isMSP?: boolean;
  onSelect?: (item: TenantListItem) => void;
  selected?: boolean;
  allowTrialExpiredInfo?: boolean;
};

const TenantItem = ({
  tenant,
  isMSP,
  selected,
  onSelect,
  allowTrialExpiredInfo = false,
}: TenantItemProps) => {
  const allowFetchSubscription = isMSP === undefined || !isMSP;
  const { isTrialExpired, isSubscriptionLoading } = useTenantSubscription({
    tenantId: tenant.id,
    allowFetch: allowFetchSubscription,
  });

  const { globalApiParams } = useApplicationContext();
  const isInTenantContext = globalApiParams?.account;

  const firstChar = tenant.name.charAt(0);
  const color = generateColorFromString(tenant.name);

  const handleSelect = () => {
    if (isTrialExpired || isSubscriptionLoading) return;
    onSelect?.(tenant);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (selected && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      handleSelect();
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selected]);

  const showTrialExpiredInfo =
    isTrialExpired && !isSubscriptionLoading && allowFetchSubscription;

  return (
    <div
      className={cn(
        "flex gap-2 items-center w-full group",
        showTrialExpiredInfo && allowTrialExpiredInfo && "cursor-not-allowed",
      )}
      onClick={handleSelect}
      tabIndex={0}
      role={"button"}
    >
      <div
        className={cn(
          "w-8 h-8 bg-nb-gray-900 border-nb-gray-800 flex items-center shrink-0 rounded-[4px] justify-center text-sm font-medium text-white uppercase",
        )}
        style={{
          color: color,
        }}
      >
        <span>{firstChar}</span>
      </div>
      <div
        className={
          "flex flex-col items-start justify-center text-xs pr-1 pl-1 relative font-normal top-[2px]"
        }
      >
        <span
          className={
            "text-sm text-nb-gray-200 whitespace-nowrap flex items-center"
          }
        >
          <TruncatedText text={tenant.name} maxWidth={"150px"} />
          {isMSP && (
            <div className={"relative -top-[1px] flex items-center"}>
              <SmallBadge
                text={"MSP"}
                className={"ml-2 -top-[.22px]"}
                variant={"white"}
              />
            </div>
          )}
        </span>
        <span
          className={"text-xs text-nb-gray-300 whitespace-nowrap"}
          title={tenant?.id}
        >
          <TruncatedText text={tenant.domain} maxWidth={"150px"} />
        </span>
      </div>

      {showTrialExpiredInfo && allowTrialExpiredInfo && (
        <div className={"ml-auto"}>
          <FullTooltip
            content={
              <div className={"max-w-xs text-xs"}>
                Trial for this tenant has expired. Please upgrade the plan to
                continue using the tenant.{" "}
                {!isInTenantContext && (
                  <InlineLink href={"/tenants"}>
                    Go to Tenants
                    <ArrowUpRightIcon size={14} />
                  </InlineLink>
                )}
              </div>
            }
          >
            <Badge
              variant={"yellow"}
              className={"h-[25px] px-2 text-[0.7rem] !border-yellow-600"}
            >
              <CircleHelp size={12} />
              Trial Expired
            </Badge>
          </FullTooltip>
        </div>
      )}
    </div>
  );
};
