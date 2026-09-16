"use client";

import { useRef, type KeyboardEvent } from "react";

export interface TabItem {
  id: string;
  label: string;
}

interface TabListProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  label: string;
}

export function tabButtonId(tabId: string): string {
  return `tab-${tabId}`;
}

export function tabPanelId(tabId: string): string {
  return `tabpanel-${tabId}`;
}

/** WAI-ARIA tabs pattern: arrow keys move focus and selection together, roving tabindex. */
export function TabList({ tabs, activeTab, onChange, label }: TabListProps) {
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      const next = tabs[nextIndex]!;
      onChange(next.id);
      buttonRefs.current[next.id]?.focus();
    }
  }

  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 border-b border-line">
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              buttonRefs.current[tab.id] = el;
            }}
            role="tab"
            id={tabButtonId(tab.id)}
            aria-selected={isActive}
            aria-controls={tabPanelId(tab.id)}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`-mb-px rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "border-b-2 border-harbor text-harbor"
                : "border-b-2 border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
