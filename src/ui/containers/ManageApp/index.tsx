import Button from "@components/Button";
import CheckboxField from "@components/CheckboxField";
import ConfirmDialog from "@components/ConfirmDialog";
import Content from "@components/Content";
import EmptyState from "@components/EmptyState";
import LoadingRows from "@components/LoadingRows";
import NoticeBanner from "@components/NoticeBanner";
import ReleaseNoticeBanner from "@components/ReleaseNoticeBanner";
import SeriesRow from "@components/SeriesRow";
import SwitchField from "@components/SwitchField";
import Tabs from "@components/Tabs";
import {
  requestDismissExtensionReleaseNotice,
  requestExportConfig,
  requestImportConfig,
  requestPopupData,
  requestRemoveCard,
  requestResetConfig,
} from "@domain/actions/popup";
import type { PopupFeedEntry } from "@domain/library";
import {
  clearExportConfig,
  clearPopupNotice,
} from "@domain/reducers/popupState";
import {
  type PopupViewProps,
  selectPopupView,
} from "@domain/selectors/popupView";
import { isDevLogEnabled, setDevLogEnabled } from "@utils/devLog";
import { openReaderPage } from "@utils/navigation";
import type { ChangeEventHandler } from "react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { connect } from "react-redux";
import {
  List,
  type RowComponentProps,
  useDynamicRowHeight,
} from "react-window";

type ManageTab = "updates" | "following" | "history" | "data";

type ManageRowsListProps = {
  busy: boolean;
  selectedTab: Exclude<ManageTab, "data">;
  rows: PopupFeedEntry[];
  onRequestAbandonSeries: (item: PopupFeedEntry) => void;
  onRequestHistoryRemoval: (item: PopupFeedEntry) => void;
  onRemoveCard: typeof requestRemoveCard;
};

type ManageDialogState =
  | { kind: "closed" }
  | { kind: "history"; item: PopupFeedEntry }
  | { kind: "reset" }
  | { kind: "subscribe"; item: PopupFeedEntry; clearSeriesData: boolean };

const MANAGE_ROW_DEFAULT_HEIGHT = 112;
const MANAGE_LIST_OVERSCAN_COUNT = 6;

type ManageAppProps = PopupViewProps & {
  clearExportConfig: typeof clearExportConfig;
  clearPopupNotice: typeof clearPopupNotice;
  requestDismissExtensionReleaseNotice: typeof requestDismissExtensionReleaseNotice;
  requestExportConfig: typeof requestExportConfig;
  requestImportConfig: typeof requestImportConfig;
  requestPopupData: typeof requestPopupData;
  requestRemoveCard: typeof requestRemoveCard;
  requestResetConfig: typeof requestResetConfig;
};

const TAB_OPTIONS: ManageTab[] = ["updates", "following", "history", "data"];

function renderTabLabel(label: string, count?: number) {
  return (
    <span className="manage-tab-label">
      <span>{label}</span>
      {typeof count === "number" ? (
        <span className="manage-tab-count">{count}</span>
      ) : null}
    </span>
  );
}

function getInitialTab(): ManageTab {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  return TAB_OPTIONS.includes(tab as ManageTab)
    ? (tab as ManageTab)
    : "following";
}

function normalizeManageSearchQuery(value: string) {
  return value.trim().toLowerCase();
}

function matchesManageSearchQuery(
  item: PopupFeedEntry,
  normalizedQuery: string,
) {
  if (!normalizedQuery) {
    return true;
  }
  return [item.title, item.comicsID].some((value) =>
    String(value || "").toLowerCase().includes(normalizedQuery),
  );
}

function ManageFeedRow({
  ariaAttributes,
  busy,
  index,
  onRequestAbandonSeries,
  onRequestHistoryRemoval,
  onRemoveCard,
  rows,
  selectedTab,
  style,
}: RowComponentProps<ManageRowsListProps>) {
  const item = rows[index];
  if (!item) {
    return null;
  }

  if (selectedTab === "updates") {
    return (
      <div {...ariaAttributes} style={style} className="px-1 py-1.5">
        <SeriesRow
          variant="manage"
          title={item.title}
          titleHref={item.url}
          siteLabel={item.siteLabel}
          cover={item.cover}
          summary={`新章節：${item.updateChapterTitle || item.lastChapterTitle}`}
          detail={`上次閱讀：${item.lastReadTitle}`}
          actions={[
            {
              icon: "arrow",
              label: "閱讀",
              variant: "primary",
              onClick: () =>
                openReaderPage(
                  item.site,
                  item.updateChapterID || item.lastChapterID,
                  item.updateChapterHref || item.lastChapterHref || item.url,
                ),
            },
            {
              icon: "trash",
              label: "略過",
              disabled: busy,
              onClick: () =>
                onRemoveCard({
                  category: "update",
                  index: item.index,
                  comicsID: item.comicsID,
                  chapterID: item.chapterID,
                  site: item.site,
                }),
            },
          ]}
        />
      </div>
    );
  }

  if (selectedTab === "following") {
    return (
      <div {...ariaAttributes} style={style} className="px-1 py-1.5">
        <SeriesRow
          variant="manage"
          title={item.title}
          titleHref={item.url}
          siteLabel={item.siteLabel}
          cover={item.cover}
          summary={`上次閱讀：${item.lastReadTitle}`}
          detail={`最新章節：${item.lastChapterTitle}`}
          actions={[
            {
              icon: "arrow",
              label: "繼續",
              variant: "primary",
              onClick: () =>
                openReaderPage(
                  item.site,
                  item.continueChapterID,
                  item.continueHref,
                ),
            },
            {
              icon: "tag",
              label: "棄坑",
              variant: "danger",
              disabled: busy,
              onClick: () => onRequestAbandonSeries(item),
            },
          ]}
        />
      </div>
    );
  }

  return (
    <div {...ariaAttributes} style={style} className="px-1 py-1.5">
      <SeriesRow
        variant="manage"
        title={item.title}
        titleHref={item.url}
        siteLabel={item.siteLabel}
        cover={item.cover}
        summary={`上次閱讀：${item.lastReadTitle}`}
        detail={`最新章節：${item.lastChapterTitle}`}
        actions={[
          {
            icon: "arrow",
            label: "繼續",
            variant: "primary",
            onClick: () =>
              openReaderPage(item.site, item.continueChapterID, item.continueHref),
          },
          {
            icon: "trash",
            label: "移除",
            variant: "danger",
            disabled: busy,
            onClick: () => onRequestHistoryRemoval(item),
          },
        ]}
      />
    </div>
  );
}

function ManageAppComponent(props: ManageAppProps) {
  const {
    hydrationStatus,
    activeAction,
    notice,
    extensionReleaseNotice,
    exportUrl,
    exportFilename,
    update,
    subscribe,
    history,
    requestDismissExtensionReleaseNotice:
      requestDismissExtensionReleaseNoticeProp,
    requestPopupData: requestPopupDataProp,
    requestExportConfig: requestExportConfigProp,
    requestImportConfig: requestImportConfigProp,
    requestResetConfig: requestResetConfigProp,
    requestRemoveCard: requestRemoveCardProp,
    clearExportConfig: clearExportConfigProp,
    clearPopupNotice: clearPopupNoticeProp,
  } = props;

  const [selectedTab, setSelectedTab] = useState<ManageTab>(getInitialTab);
  const [debugLogEnabled, setDebugLogEnabled] = useState(isDevLogEnabled);
  const [dialogState, setDialogState] = useState<ManageDialogState>({
    kind: "closed",
  });
  const [localError, setLocalError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = useMemo(
    () => normalizeManageSearchQuery(deferredSearchQuery),
    [deferredSearchQuery],
  );
  const clearSeriesDataCheckboxId = useId();
  const clearSeriesDataDescriptionId = useId();
  const rowHeights = useDynamicRowHeight({
    defaultRowHeight: MANAGE_ROW_DEFAULT_HEIGHT,
    key: `${selectedTab}:${normalizedSearchQuery}`,
  });
  const downloadRef = useRef<HTMLAnchorElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    requestPopupDataProp("manage");
  }, [requestPopupDataProp]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", selectedTab);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", nextUrl);
  }, [selectedTab]);

  useEffect(() => {
    if (!exportUrl) return;
    const link = downloadRef.current;
    if (!link) return;
    link.href = exportUrl;
    link.download = exportFilename || "comic-scroller-config.json";
    link.click();
    window.URL.revokeObjectURL(exportUrl);
    clearExportConfigProp();
  }, [clearExportConfigProp, exportFilename, exportUrl]);

  const busy = activeAction !== null;
  const isLoading = hydrationStatus !== "ready";

  const currentRows = useMemo(() => {
    if (selectedTab === "updates") return update;
    if (selectedTab === "following") return subscribe;
    if (selectedTab === "history") return history;
    return [];
  }, [history, selectedTab, subscribe, update]);

  const filteredRows = useMemo(() => {
    if (!normalizedSearchQuery) {
      return currentRows;
    }
    return currentRows.filter((item) =>
      matchesManageSearchQuery(item, normalizedSearchQuery),
    );
  }, [currentRows, normalizedSearchQuery]);

  const isSearching = normalizedSearchQuery.length > 0;

  const handleSearchQueryChange: ChangeEventHandler<HTMLInputElement> =
    useCallback((event) => {
      setSearchQuery(event.currentTarget.value);
    }, []);

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.currentTarget.files?.item(0);
    if (!file) return;
    const input = event.currentTarget;

    void file
      .arrayBuffer()
      .then((raw) => {
        setLocalError("");
        clearPopupNoticeProp();
        requestImportConfigProp(raw);
      })
      .catch(() => {
        setLocalError("目前無法讀取設定檔。");
      })
      .finally(() => {
        input.value = "";
      });
  };

  const handleDebugLogToggle = () => {
    const enabled = !debugLogEnabled;
    if (!setDevLogEnabled(enabled)) {
      setLocalError("目前無法切換除錯記錄。");
      return;
    }
    setLocalError("");
    setDebugLogEnabled(enabled);
  };

  const closeDialog = useCallback(() => {
    if (busy) {
      return;
    }
    setDialogState({ kind: "closed" });
  }, [busy]);

  const openResetDialog = useCallback(() => {
    setDialogState({ kind: "reset" });
  }, []);

  const openHistoryRemovalDialog = useCallback(
    (item: PopupFeedEntry) => {
      setDialogState({
        kind: "history",
        item,
      });
    },
    [],
  );

  const openAbandonSeriesDialog = useCallback((item: PopupFeedEntry) => {
    setDialogState({
      kind: "subscribe",
      item,
      clearSeriesData: false,
    });
  }, []);

  const handleSubscribeClearSeriesDataChange: ChangeEventHandler<HTMLInputElement> =
    useCallback((event) => {
      const checked = event.currentTarget.checked;
      setDialogState((currentState) =>
        currentState.kind === "subscribe"
          ? {
              ...currentState,
              clearSeriesData: checked,
            }
          : currentState,
      );
    }, []);

  const handleDialogConfirm = useCallback(() => {
    if (dialogState.kind === "closed") {
      return;
    }

    setLocalError("");
    clearPopupNoticeProp();

    if (dialogState.kind === "reset") {
      requestResetConfigProp();
      setDialogState({ kind: "closed" });
      return;
    }

    if (dialogState.kind === "history") {
      requestRemoveCardProp({
        category: "history",
        index: dialogState.item.index,
        comicsID: dialogState.item.comicsID,
        site: dialogState.item.site,
      });
      setDialogState({ kind: "closed" });
      return;
    }

    requestRemoveCardProp({
      category: "subscribe",
      index: dialogState.item.index,
      comicsID: dialogState.item.comicsID,
      site: dialogState.item.site,
      ...(dialogState.clearSeriesData ? { clearSeriesData: true } : {}),
    });
    setDialogState({ kind: "closed" });
  }, [
    clearPopupNoticeProp,
    dialogState,
    requestRemoveCardProp,
    requestResetConfigProp,
  ]);

  const renderConfirmDialog = () => {
    if (dialogState.kind === "closed") {
      return null;
    }

    if (dialogState.kind === "reset") {
      return (
        <ConfirmDialog
          open
          title="重置資料"
          description="確定重置所有資料？此操作會刪除更新、追蹤、紀錄與作品快取。"
          confirmLabel="重置資料"
          busy={busy}
          onClose={closeDialog}
          onConfirm={handleDialogConfirm}
        />
      );
    }

    if (dialogState.kind === "history") {
      return (
        <ConfirmDialog
          open
          title="移除閱讀紀錄"
          description={`確定移除「${dialogState.item.title}」的閱讀紀錄嗎？追蹤、更新與作品資料會保留。`}
          confirmLabel="移除紀錄"
          busy={busy}
          onClose={closeDialog}
          onConfirm={handleDialogConfirm}
        />
      );
    }

    return (
      <ConfirmDialog
        open
        title="棄坑作品"
        description={`確定取消追蹤「${dialogState.item.title}」嗎？未勾選時只會取消追蹤並清除更新提醒。`}
        confirmLabel="確認棄坑"
        busy={busy}
        onClose={closeDialog}
        onConfirm={handleDialogConfirm}
      >
        <CheckboxField
          id={clearSeriesDataCheckboxId}
          descriptionId={clearSeriesDataDescriptionId}
          label="一併清除閱讀紀錄與作品資料"
          description="勾選後會額外刪除這部作品的閱讀紀錄與快取。此操作無法復原。"
          checked={dialogState.clearSeriesData}
          disabled={busy}
          onChange={handleSubscribeClearSeriesDataChange}
        />
      </ConfirmDialog>
    );
  };

  const rowProps = useMemo<ManageRowsListProps>(
    () => ({
      busy,
      selectedTab:
        selectedTab === "data" ? "following" : selectedTab,
      rows: filteredRows,
      onRequestAbandonSeries: openAbandonSeriesDialog,
      onRequestHistoryRemoval: openHistoryRemovalDialog,
      onRemoveCard: requestRemoveCardProp,
    }),
    [
      busy,
      filteredRows,
      openAbandonSeriesDialog,
      openHistoryRemovalDialog,
      requestRemoveCardProp,
      selectedTab,
    ],
  );

  const renderRows = () => {
    if (isLoading) {
      return <LoadingRows count={4} />;
    }

    if (isSearching && currentRows.length > 0 && filteredRows.length === 0) {
      return (
        <EmptyState
          title="找不到符合的作品"
          description="請用作品名或作品 ID 搜尋。"
        />
      );
    }

    if (selectedTab === "updates" && currentRows.length === 0) {
      return (
        <EmptyState
          title="目前沒有更新"
          description="已追蹤作品目前沒有新章節。"
        />
      );
    }

    if (selectedTab === "following" && currentRows.length === 0) {
      return (
        <EmptyState
          title="尚未追蹤作品"
          description="在閱讀頁追蹤作品後會顯示於此。"
        />
      );
    }

    if (selectedTab === "history" && currentRows.length === 0) {
      return (
        <EmptyState
          title="尚無閱讀紀錄"
          description="開始閱讀後會顯示於此。"
        />
      );
    }

    return (
      <List
        className="popup-scrollbar scrollbar-stable"
        overscanCount={MANAGE_LIST_OVERSCAN_COUNT}
        rowComponent={ManageFeedRow}
        rowCount={filteredRows.length}
        rowHeight={rowHeights}
        rowProps={rowProps}
        style={{
          height: "100%",
          width: "100%",
        }}
      />
    );
  };

  return (
    <div className="manage-shell">
      <div className="manage-window">
        <div className="manage-topbar">
          <div className="min-w-0 flex-1">
            <div className="manage-title">書庫</div>
            <p className="manage-subtitle">
              追蹤、閱讀紀錄與資料管理。
            </p>
          </div>
        </div>

        <Tabs
          value={selectedTab}
          onValueChange={(value) => setSelectedTab(value as ManageTab)}
        >
          <Tabs.List variant="manage" className="manage-tabbar">
            <Tabs.Trigger variant="manage" className="manage-tab" value="updates">
              {renderTabLabel("更新", update.length)}
            </Tabs.Trigger>
            <Tabs.Trigger
              variant="manage"
              className="manage-tab"
              value="following"
            >
              {renderTabLabel("追蹤", subscribe.length)}
            </Tabs.Trigger>
            <Tabs.Trigger variant="manage" className="manage-tab" value="history">
              {renderTabLabel("紀錄", history.length)}
            </Tabs.Trigger>
            <Tabs.Trigger variant="manage" className="manage-tab" value="data">
              {renderTabLabel("選項")}
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs>

        <Content
          variant="manage"
          className={`manage-content ${
            selectedTab === "data" ? "overflow-y-auto" : "overflow-hidden"
          }`}
        >
            {extensionReleaseNotice ? (
              <ReleaseNoticeBanner
                className="mb-4"
                density="manage"
                notice={extensionReleaseNotice}
                onDismiss={requestDismissExtensionReleaseNoticeProp}
              />
            ) : null}
            {localError ? (
              <div className="mb-4">
                <NoticeBanner
                  message={localError}
                  tone="error"
                  onDismiss={() => setLocalError("")}
                />
              </div>
            ) : null}
            {notice ? (
              <div className="mb-4">
                <NoticeBanner
                  message={notice.message}
                  tone={notice.tone}
                  onDismiss={clearPopupNoticeProp}
                />
              </div>
            ) : null}

            {selectedTab === "data" ? (
              <div className="manage-settings-stack">
                <section className="manage-settings-section">
                  <h2 className="manage-section-title">開發者功能</h2>
                  <SwitchField
                    id="manage-debug-log-toggle"
                    label="除錯記錄"
                    description="輸出 Redux action 與解析 trace 到 console。"
                    checked={debugLogEnabled}
                    onToggle={handleDebugLogToggle}
                  />
                </section>
                <section className="manage-settings-section">
                  <h2 className="manage-section-title">資料</h2>
                  <p className="manage-section-desc">
                    匯入、匯出或重置資料。
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      variant="primary"
                      disabled={busy}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      匯入設定
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setLocalError("");
                        clearPopupNoticeProp();
                        requestExportConfigProp();
                      }}
                    >
                      匯出設定
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busy}
                      onClick={openResetDialog}
                    >
                      重置資料
                    </Button>
                  </div>
                </section>
              </div>
            ) : (
              <div className="manage-list-layout">
                <div className="manage-search-row">
                  <label className="manage-search-field">
                    <span className="sr-only">搜尋作品名或 ID</span>
                    <input
                      type="search"
                      className="manage-search-input"
                      placeholder="搜尋作品名或 ID"
                      value={searchQuery}
                      disabled={isLoading}
                      onChange={handleSearchQueryChange}
                    />
                  </label>
                  <div className="manage-search-count" aria-live="polite">
                    {isSearching
                      ? `${filteredRows.length} / ${currentRows.length}`
                      : `${currentRows.length} 筆`}
                  </div>
                </div>
                <div className="manage-list-body">{renderRows()}</div>
              </div>
            )}
        </Content>
      </div>
      <a ref={downloadRef} className="hidden">
        匯出設定
      </a>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
      {renderConfirmDialog()}
    </div>
  );
}

export default connect(selectPopupView, {
  clearExportConfig,
  clearPopupNotice,
  requestDismissExtensionReleaseNotice,
  requestExportConfig,
  requestImportConfig,
  requestPopupData,
  requestRemoveCard,
  requestResetConfig,
})(ManageAppComponent);
