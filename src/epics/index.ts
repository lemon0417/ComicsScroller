import { combineEpics } from "redux-observable";

import {
  fetchChapterEpic,
  fetchImgListEpic,
  fetchImgSrcEpic,
  updateReadEpic,
} from "./getAction";
import imageRetryEpic from "./imageRetryEpic";
import navigationEpic from "./navigationEpic";
import pendingChapterGateEpic from "./pendingChapterGateEpic";
import readerLocationEpic from "./readerLocationEpic";
import readerSyncEpic from "./readerSyncEpic";
import resizeEpic from "./resizeEpic";
import scrollEpic from "./scrollEpic";
import subscribeEpic from "./subscribeEpic";

const rootEpic = combineEpics(
  fetchChapterEpic,
  fetchImgSrcEpic,
  imageRetryEpic,
  pendingChapterGateEpic,
  scrollEpic,
  resizeEpic,
  navigationEpic,
  subscribeEpic,
  readerLocationEpic,
  readerSyncEpic,
  fetchImgListEpic,
  updateReadEpic,
);

export default rootEpic;
