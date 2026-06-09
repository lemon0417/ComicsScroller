import type { SiteAdapter } from "../types";
import { fetchMeta$ } from "./meta";

const comicbusAdapter: SiteAdapter = {
  key: "comicbus",
  baseURL: "http://www.comicbus.com",
  fetchMeta: fetchMeta$,
};

export default comicbusAdapter;
