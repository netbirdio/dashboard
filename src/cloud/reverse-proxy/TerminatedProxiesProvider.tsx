import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Badge from "@components/Badge";
import FullTooltip from "@components/FullTooltip";
import { AlertTriangle } from "lucide-react";
import InlineLink from "@components/InlineLink";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";

export function TerminatedProxiesProvider() {
  const { reverseProxies } = useReverseProxies();
  const terminated = reverseProxies?.filter((p) => p?.terminated) ?? [];

  return terminated?.map((proxy) => (
    <TerminatedPortal key={proxy.id} proxyId={proxy.id as string} />
  ));
}

const DISABLED_SELECTORS = [
  "[data-active-cell]",
  "[data-auth-cell]",
  "[data-targets-cell]",
  "[data-cluster-cell]",
  "[data-name-cell]",
];

const ACTION_SELECTORS = [
  "data-proxy-edit-action",
  "data-proxy-settings-action",
];

const blockEvent = (e: Event) => {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
};

function disableElement(el: HTMLElement) {
  el.style.pointerEvents = "none";
  el.style.opacity = "0.5";
  el.addEventListener("click", blockEvent, true);
}

function enableElement(el: HTMLElement) {
  el.style.pointerEvents = "";
  el.style.opacity = "";
  el.removeEventListener("click", blockEvent, true);
}

const terminatedBadge = (
  <FullTooltip
    content={
      <div className={"text-xs max-w-xs"}>
        This service has been terminated by the NetBird team as it violates the
        Terms of Service. For questions, please contact{" "}
        <InlineLink href="mailto:support@netbird.io?subject=Request%20for%20Assistance%3A%20Terminated%20Service">
          support@netbird.io
        </InlineLink>
      </div>
    }
    interactive={true}
  >
    <Badge variant={"red"}>
      <AlertTriangle size={12} />
      Terminated
    </Badge>
  </FullTooltip>
);

function findAndDisableAll(proxyId: string) {
  const disabled: HTMLElement[] = [];
  const statusCells: Element[] = [];
  let row: HTMLElement | null = null;
  let actionTd: HTMLElement | null = null;

  try {
    row = document.querySelector<HTMLElement>(
      `[data-row-id="${proxyId}"]`,
    );

    if (row) {
      row.style.pointerEvents = "none";
      row.style.cursor = "default";

      actionTd = row.querySelector<HTMLElement>("td:last-child");
      if (actionTd) actionTd.style.pointerEvents = "auto";
    }

    for (const sel of DISABLED_SELECTORS) {
      const el = row?.querySelector<HTMLElement>(sel);
      if (el) {
        disableElement(el);
        disabled.push(el);
      }
    }

    const mainStatusCell = row?.querySelector<HTMLElement>("[data-status-cell]");
    if (mainStatusCell) {
      statusCells.push(mainStatusCell);
      mainStatusCell.style.pointerEvents = "auto";
    }

    const flatCells = document.querySelectorAll<HTMLElement>(
      `[data-proxy-id="${proxyId}"]`,
    );
    for (const flatCell of flatCells) {
      disableElement(flatCell);
      disabled.push(flatCell);
      const statusCell =
        flatCell.querySelector("[data-status-cell]") ??
        flatCell.parentElement?.querySelector("[data-status-cell]");
      if (statusCell) statusCells.push(statusCell);
    }

    for (const attr of ACTION_SELECTORS) {
      const items = document.querySelectorAll<HTMLElement>(
        `[${attr}="${proxyId}"]`,
      );
      for (const item of items) {
        disableElement(item);
        disabled.push(item);
      }
    }
  } catch (e) {}

  return { disabled, statusCells, row, actionTd };
}

function TerminatedPortal({ proxyId }: { proxyId: string }) {
  const [statusTargets, setStatusTargets] = useState<Element[]>([]);

  useEffect(() => {
    const tracked = new Set<HTMLElement>();
    let trackedRow: HTMLElement | null = null;
    let trackedActionTd: HTMLElement | null = null;

    const apply = () => {
      const { disabled, statusCells, row, actionTd } =
        findAndDisableAll(proxyId);
      for (const el of disabled) tracked.add(el);
      if (row) trackedRow = row;
      if (actionTd) trackedActionTd = actionTd;
      if (statusCells.length > 0) {
        setStatusTargets((prev) => {
          const prevSet = new Set(prev);
          const newCells = statusCells.filter((c) => !prevSet.has(c));
          return newCells.length > 0 ? [...prev, ...newCells] : prev;
        });
      }
    };

    apply();

    const observer = new MutationObserver(() => {
      try {
        apply();
      } catch (e) {}
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      for (const el of tracked) {
        try {
          enableElement(el);
        } catch (e) {}
      }
      if (trackedRow) {
        trackedRow.style.pointerEvents = "";
        trackedRow.style.cursor = "";
      }
      if (trackedActionTd) {
        trackedActionTd.style.pointerEvents = "";
      }
    };
  }, [proxyId]);

  if (statusTargets.length === 0) return null;

  return statusTargets.map((target, i) =>
    createPortal(terminatedBadge, target, `${proxyId}-${i}`),
  );
}
