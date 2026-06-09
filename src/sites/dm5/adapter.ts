import type { SiteAdapter } from "../types";
import { fetchMeta$ } from "./meta";

const dm5Adapter: SiteAdapter = {
  key: "dm5",
  baseURL: "https://www.dm5.com",
  fetchMeta: fetchMeta$,
};

export default dm5Adapter;
