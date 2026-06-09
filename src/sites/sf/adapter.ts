import type { SiteAdapter } from "../types";
import { fetchMeta$ } from "./meta";

const sfAdapter: SiteAdapter = {
  key: "sf",
  baseURL: "http://comic.sfacg.com",
  fetchMeta: fetchMeta$,
};

export default sfAdapter;
