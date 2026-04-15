import { combineEpics } from "redux-observable";

import {
  fetchChapterEpic,
  fetchImgListEpic,
  fetchImgSrcEpic,
  updateReadEpic,
} from "./getAction";
import imageRetryEpic from "./imageRetryEpic";
import navigationEpic from "./navigationEpic";
import readerLocationEpic from "./readerLocationEpic";
import resizeEpic from "./resizeEpic";
import scrollEpic from "./scrollEpic";
import subscribeEpic from "./subscribeEpic";

const rootEpic = combineEpics(
  fetchChapterEpic,
  fetchImgSrcEpic,
  imageRetryEpic,
  scrollEpic,
  resizeEpic,
  navigationEpic,
  subscribeEpic,
  readerLocationEpic,
  fetchImgListEpic,
  updateReadEpic,
);

export default rootEpic;
