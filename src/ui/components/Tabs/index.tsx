import { cn } from "@utils/cn";
import type { KeyboardEvent, ReactNode } from "react";
import { createContext, useCallback, useContext } from "react";

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

type TabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
};

function TabsRoot({ value, onValueChange, children }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      {children}
    </TabsContext.Provider>
  );
}

type TabsListProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "manage";
};

function TabsList({
  children,
  className,
  variant = "default",
}: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "ds-tabbar",
        variant !== "default" ? `ds-tabbar--${variant}` : undefined,
        className,
      )}
    >
      {children}
    </div>
  );
}

type TabProps = {
  value: string;
  children?: ReactNode;
  className?: string;
  variant?: "default" | "manage";
};

function Tab({
  value,
  children,
  className,
  variant = "default",
}: TabProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tab must be used within <Tabs>.");
  }
  const isActive = context.value === value;
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const tabList = event.currentTarget.closest('[role="tablist"]');
      if (!(tabList instanceof HTMLElement)) {
        return;
      }

      const tabs = Array.from(
        tabList.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
      ).filter((tab) => !tab.disabled);
      const currentIndex = tabs.indexOf(event.currentTarget);
      if (tabs.length === 0 || currentIndex < 0) {
        return;
      }

      let nextIndex: number | null = null;

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      }

      if (nextIndex === null) {
        return;
      }

      event.preventDefault();
      const nextTab = tabs[nextIndex];
      const nextValue = nextTab.dataset.tabValue;

      nextTab.focus();
      if (nextValue) {
        context.onValueChange(nextValue);
      }
    },
    [context],
  );

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      data-tab-value={value}
      className={cn(
        "ds-tab",
        isActive ? "ds-tab-active" : undefined,
        variant !== "default" ? `ds-tab--${variant}` : undefined,
        className,
      )}
      onClick={() => context.onValueChange(value)}
      onKeyDown={handleKeyDown}
    >
      {children ?? value}
    </button>
  );
}

type TabsComponent = typeof TabsRoot & {
  List: typeof TabsList;
  Trigger: typeof Tab;
};

const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: Tab,
}) as TabsComponent;

export default Tabs;
