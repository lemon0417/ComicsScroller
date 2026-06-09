import { setLibraryVersion } from "./compat";
import {
  LIBRARY_DB_VERSION,
  LIBRARY_META_KEY,
  LIBRARY_SCHEMA_VERSION,
  META_STORE,
} from "./schema";

jest.mock("./db", () => ({
  openLibraryDb: jest.fn(),
  requestToPromise: jest.fn((value) => Promise.resolve(value)),
  transactionDone: jest.fn(() => Promise.resolve()),
}));

jest.mock("./shared", () => {
  const actual = jest.requireActual("./shared");
  return {
    ...actual,
    ensureLibraryReady: jest.fn(() => Promise.resolve()),
  };
});

const dbModule = jest.requireMock("./db") as {
  openLibraryDb: jest.Mock;
};

describe("library compatibility helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sets the library version without hardcoded schema literals", async () => {
    const metaStore = {
      get: jest.fn(() => undefined),
      put: jest.fn(() => undefined),
    };
    const transaction = {
      objectStore: jest.fn((storeName: string) =>
        storeName === META_STORE ? metaStore : undefined,
      ),
    };
    const db = {
      transaction: jest.fn(() => transaction),
    };
    dbModule.openLibraryDb.mockResolvedValue(db);

    await setLibraryVersion("4.0.99");

    expect(metaStore.put).toHaveBeenCalledWith({
      key: LIBRARY_META_KEY,
      value: expect.objectContaining({
        initialized: true,
        version: "4.0.99",
        schemaVersion: LIBRARY_SCHEMA_VERSION,
        dbSchemaVersion: LIBRARY_DB_VERSION,
      }),
    });
  });
});
