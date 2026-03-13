import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { CountrySelector } from "@components/ui/CountrySelector";
import { cn } from "@utils/helpers";
import cidr from "ip-cidr";
import { Globe, MinusCircleIcon, PlusCircle, ShieldCheck } from "lucide-react";
import React, { useState } from "react";
import { AccessRestrictions } from "@/interfaces/ReverseProxy";

let nextRowId = 0;

type Props = {
  value: AccessRestrictions;
  onChange: (value: AccessRestrictions) => void;
};

type CidrRow = { id: number; value: string };

type RowListProps = {
  values: string[];
  onChange: (values: string[]) => void;
};

function CidrList({ values, onChange }: Readonly<RowListProps>) {
  const [rows, setRows] = useState<CidrRow[]>(() =>
    values.map((v) => ({ id: nextRowId++, value: v })),
  );
  const [errors, setErrors] = useState<Record<number, string>>({});

  const addRow = () => {
    const next = [...rows, { id: nextRowId++, value: "" }];
    setRows(next);
    onChange(next.map((r) => r.value));
  };

  const updateRow = (id: number, raw: string) => {
    const next = rows.map((r) => (r.id === id ? { ...r, value: raw } : r));
    setRows(next);
    onChange(next.map((r) => r.value));

    if (raw && !cidr.isValidCIDR(raw)) {
      setErrors((prev) => ({ ...prev, [id]: "Invalid CIDR format" }));
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  const removeRow = (id: number) => {
    const next = rows.filter((r) => r.id !== id);
    setRows(next);
    onChange(next.map((r) => r.value));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.id}>
          <div className="flex gap-2">
            <input
              type="text"
              value={row.value}
              onChange={(e) => updateRow(row.id, e.target.value.trim())}
              placeholder="e.g. 10.0.0.0/8"
              className={cn(
                "flex-1 h-[42px] px-3 text-sm font-mono bg-nb-gray-900/40 rounded-md outline-none",
                "border placeholder:text-neutral-400/70",
                errors[row.id]
                  ? "border-red-400"
                  : "border-nb-gray-700",
              )}
            />
            <Button
              className="h-[42px]"
              variant="default-outline"
              onClick={() => removeRow(row.id)}
            >
              <MinusCircleIcon size={15} />
            </Button>
          </div>
          {errors[row.id] && (
            <p className="text-xs text-red-400 mt-1">{errors[row.id]}</p>
          )}
        </div>
      ))}
      <Button variant="dotted" size="sm" onClick={addRow}>
        <PlusCircle size={16} />
        Add CIDR
      </Button>
    </div>
  );
}

type CountryRow = { id: number; value: string };

function CountryList({ values, onChange }: Readonly<RowListProps>) {
  const [rows, setRows] = useState<CountryRow[]>(() =>
    values.map((v) => ({ id: nextRowId++, value: v })),
  );

  const addCountry = () => {
    const next = [...rows, { id: nextRowId++, value: "" }];
    setRows(next);
    onChange(next.map((r) => r.value));
  };

  const updateCountry = (id: number, code: string) => {
    if (rows.some((r) => r.value === code)) return;
    const next = rows.map((r) => (r.id === id ? { ...r, value: code } : r));
    setRows(next);
    onChange(next.map((r) => r.value));
  };

  const removeCountry = (id: number) => {
    const next = rows.filter((r) => r.id !== id);
    setRows(next);
    onChange(next.map((r) => r.value));
  };

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.id} className="flex gap-2">
          <div className="flex-1">
            <CountrySelector
              value={row.value}
              onChange={(v) => updateCountry(row.id, v)}
            />
          </div>
          <Button
            className="h-[42px]"
            variant="default-outline"
            onClick={() => removeCountry(row.id)}
          >
            <MinusCircleIcon size={15} />
          </Button>
        </div>
      ))}
      <Button variant="dotted" size="sm" onClick={addCountry}>
        <PlusCircle size={16} />
        Add Country
      </Button>
    </div>
  );
}

export default function AccessRestrictionsSection({
  value,
  onChange,
}: Readonly<Props>) {
  const update = (patch: Partial<AccessRestrictions>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="px-8 flex-col flex gap-6">
      <div>
        <Label>
          <ShieldCheck size={14} />
          CIDR Allowlist
        </Label>
        <HelpText>
          Only connections from these IP ranges will be allowed. All other
          IPs will be blocked. Leave empty to allow all.
        </HelpText>
        <CidrList
          values={value.allowed_cidrs ?? []}
          onChange={(v) => update({ allowed_cidrs: v })}
        />
      </div>

      <div>
        <Label>
          <ShieldCheck size={14} />
          CIDR Blocklist
        </Label>
        <HelpText>
          Block connections from these IP ranges. Takes priority over the
          allowlist.
        </HelpText>
        <CidrList
          values={value.blocked_cidrs ?? []}
          onChange={(v) => update({ blocked_cidrs: v })}
        />
      </div>

      <div>
        <Label>
          <Globe size={14} />
          Country Allowlist
        </Label>
        <HelpText>
          Only connections from these countries will be allowed. All other
          countries will be blocked. Leave empty to allow all.
        </HelpText>
        <CountryList
          values={value.allowed_countries ?? []}
          onChange={(v) => update({ allowed_countries: v })}
        />
      </div>

      <div>
        <Label>
          <Globe size={14} />
          Country Blocklist
        </Label>
        <HelpText>
          Block connections from these countries. Takes priority over the
          allowlist.
        </HelpText>
        <CountryList
          values={value.blocked_countries ?? []}
          onChange={(v) => update({ blocked_countries: v })}
        />
      </div>
    </div>
  );
}
