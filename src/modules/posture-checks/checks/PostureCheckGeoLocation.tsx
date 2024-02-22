import Button from "@components/Button";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Label } from "@components/Label";
import { ModalClose, ModalFooter } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import { RadioGroup, RadioGroupItem } from "@components/RadioGroup";
import { CitySelector } from "@components/ui/CitySelector";
import { CountrySelector } from "@components/ui/CountrySelector";
import { isEmpty, uniqueId } from "lodash";
import {
  ExternalLinkIcon,
  FlagIcon,
  MinusCircleIcon,
  PlusCircle,
  ShieldCheck,
  ShieldXIcon,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { GeoLocation, GeoLocationCheck } from "@/interfaces/PostureCheck";
import { PostureCheckCard } from "@/modules/posture-checks/ui/PostureCheckCard";

type Props = {
  value?: GeoLocationCheck;
  onChange: (value: GeoLocationCheck | undefined) => void;
};

export const PostureCheckGeoLocation = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <PostureCheckCard
      open={open}
      setOpen={setOpen}
      icon={<FlagIcon size={16} />}
      title={"Country & Region"}
      description={
        "Restrict access in your network based on country or region."
      }
      iconClass={"bg-gradient-to-tr from-indigo-500 to-indigo-400"}
      modalWidthClass={"max-w-2xl"}
      active={value ? value?.locations?.length > 0 : false}
      onReset={() => onChange(undefined)}
      license={
        <div className={"text-xs max-w-xs"}>
          This check includes GeoLite2 data created by MaxMind, available from{" "}
          <InlineLink href={"https://www.maxmind.com"} target={"_blank"}>
            https://www.maxmind.com
          </InlineLink>
        </div>
      }
    >
      <CheckContent
        value={value}
        onChange={(v) => {
          onChange(v);
          setOpen(false);
        }}
      />
    </PostureCheckCard>
  );
};

const CheckContent = ({ value, onChange }: Props) => {
  const [allowDenyLocation, setAllowDenyLocation] = useState<string>(
    value?.action ? value.action : "allow",
  );
  const [locations, setLocations] = useState<GeoLocation[]>(
    value?.locations.map((l) => {
      return {
        id: uniqueId("location"),
        country_code: l.country_code,
        city_name: l.city_name || "",
      };
    }) || [],
  );

  const updateLocation = (id: string, location: GeoLocation) => {
    const find = locations.find((l) => l.id === id);
    if (find) {
      Object.assign(find, location);
      setLocations([...locations]);
    }
  };

  const removeLocation = (id: string) => {
    setLocations(locations.filter((l) => l.id !== id));
  };

  const addLocation = () => {
    setLocations([
      ...locations,
      { id: uniqueId("location"), country_code: "AF", city_name: "" },
    ]);
  };

  return (
    <>
      <div className={"flex flex-col px-8 gap-2 pb-6"}>
        <div className={"flex justify-between items-start gap-10 mt-2"}>
          <div>
            <Label>Allow or Block Location</Label>
            <HelpText className={""}>
              Choose whether you want to allow or block access from specific
              countries or regions
            </HelpText>
          </div>
          <RadioGroup value={allowDenyLocation} onChange={setAllowDenyLocation}>
            <RadioGroupItem value={"allow"} variant={"green"}>
              <ShieldCheck size={16} />
              Allow
            </RadioGroupItem>
            <RadioGroupItem value={"deny"} variant={"red"}>
              <ShieldXIcon size={16} />
              Block
            </RadioGroupItem>
          </RadioGroup>
        </div>
        {locations.length > 0 && (
          <div className={"mb-2 flex flex-col gap-2 w-full "}>
            {locations.map((location) => {
              return (
                <div key={location.id} className={"flex gap-2"}>
                  <CountrySelector
                    value={location.country_code}
                    onChange={(value) => {
                      updateLocation(location.id, {
                        ...location,
                        country_code: value,
                      });
                    }}
                  />
                  {location.country_code && (
                    <CitySelector
                      value={location.city_name || ""}
                      onChange={(value) => {
                        updateLocation(location.id, {
                          ...location,
                          city_name: value,
                        });
                      }}
                      country={location.country_code}
                    />
                  )}

                  <Button
                    className={"h-[42px]"}
                    variant={"default-outline"}
                    onClick={() => removeLocation(location.id)}
                  >
                    <MinusCircleIcon size={15} />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        <Button
          variant={"dotted"}
          size={"sm"}
          disabled={allowDenyLocation == "all"}
          onClick={addLocation}
        >
          <PlusCircle size={16} />
          Add Location
        </Button>
      </div>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink href={"https://docs.netbird.io/how-to/manage-posture-checks#geolocation-check"} target={"_blank"}>
              Country & Region Check
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>
          <Button
            variant={"primary"}
            onClick={() => {
              if (isEmpty(locations)) {
                onChange(undefined);
              } else {
                onChange({
                  action: allowDenyLocation as "allow" | "deny",
                  locations: locations,
                });
              }
            }}
          >
            Save
          </Button>
        </div>
      </ModalFooter>
    </>
  );
};
