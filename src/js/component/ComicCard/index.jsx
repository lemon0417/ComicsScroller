// @flow
import React, { Component } from 'react';
import { connect } from 'react-redux';
import filter from 'lodash/filter';
import pickBy from 'lodash/pickBy';
import TrashTopIcon from 'imgs/bin_top.svg';
import TrashBodyIcon from 'imgs/bin_body.svg';
import {
  moveCard,
  removeCard,
  shiftCards,
} from '../../container/PopUpApp/reducers/popup';
import cn from './ComicCard.css';

declare var chrome: any;

function getComicCardClass(shift: boolean, move: boolean) {
  if (move) return cn.ComicCard_move;
  if (shift) return cn.ComicCard_shift;
  return cn.ComicCard;
}

class ComicCard extends Component {
  props: {
    url: string,
    category: string,
    comicsID: string,
    chapterID: string,
    cover: string,
    title: string,
    site: string,
    index: number,
    move: boolean,
    shift: boolean,
    moveCard: Function,
    lastRead: {
      href: string,
      title: string,
    },
    lastChapter: {
      href: string,
      title: string,
    },
    updateChapter: {
      href: string,
      title: string,
    },
  };

  pageClickHandler = () => {
    chrome.tabs.create({ url: this.props.url });
  };

  lastReadHandler = () => {
    chrome.tabs.create({ url: this.props.lastRead.href });
  };

  lastChapterHandler = () => {
    chrome.tabs.create({ url: this.props.lastChapter.href });
  };

  updateChapterHandler = () => {
    chrome.tabs.create({ url: this.props.updateChapter.href });
  };

  removeHandler = () => {
    chrome.storage.local.get(store => {
      let newStore = {};
      if (this.props.category === 'history') {
        newStore = {
          history: filter(
            store.history,
            item => item.comicsID !== this.props.comicsID,
          ),
          subscribe: filter(
            store.subscribe,
            item => item.comicsID !== this.props.comicsID,
          ),
          update: filter(
            store.update,
            item => item.comicsID !== this.props.comicsID,
          ),
          [this.props.site]: pickBy(
            store[this.props.site],
            (item, key) => key !== this.props.comicsID,
          ),
        };
      } else if (this.props.category === 'subscribe') {
        newStore = {
          subscribe: filter(
            store.subscribe,
            (item, i) => i !== this.props.index,
          ),
          update: filter(
            store.update,
            item => item.comicsID !== this.props.comicsID,
          ),
        };
      } else if (this.props.category === 'update') {
        newStore = {
          update: filter(
            store.update,
            item =>
              item.comicsID !== this.props.comicsID ||
              item.chapterID !== this.props.chapterID,
          ),
        };
      }
      chrome.storage.local.set(newStore, err => {
        if (!err) {
          chrome.browserAction.setBadgeText({
            text: `${
              newStore.update.length === 0 ? '' : newStore.update.length
            }`,
          });
          this.props.moveCard(this.props.category, this.props.index);
          chrome.runtime.sendMessage({ msg: 'UPDATE' });
        }
      });
    });
  };

  render() {
    return (
      <div
        className={getComicCardClass(this.props.shift, this.props.move)}
        data-index={this.props.index}
        data-move={this.props.move}
        data-shift={this.props.shift}
      >
        <img src={this.props.cover} loading="lazy" alt={'cover'} />
        <div className={cn.trash} onClick={this.removeHandler}>
          <TrashTopIcon className={cn.trashTop} />
          <TrashBodyIcon className={cn.trashBody} />
        </div>
        <div className={cn.infor}>
          <h1 onClick={this.pageClickHandler}>{this.props.title}</h1>
          <div className={cn.itemContainer}>
            {this.props.updateChapter ? (
              <div>
                <span>更新章節</span>
                <span onClick={this.updateChapterHandler}>
                  {this.props.updateChapter.title}
                </span>
              </div>
            ) : (
              undefined
            )}
            <div>
              <span>上次看到</span>
              <span onClick={this.lastReadHandler}>
                {this.props.lastRead.title}
              </span>
            </div>
            <div>
              <span>最新一話</span>
              <span onClick={this.lastChapterHandler}>
                {this.props.lastChapter.title}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state, ownProps) {
  const {
    title,
    lastRead,
    cover,
    url,
    chapters,
    chapterList,
  } = state.popup[ownProps.site][ownProps.comicsID];
  return {
    title,
    url,
    cover,
    lastRead: chapters[lastRead] || {},
    lastChapter:
      chapterList[0] && chapters[chapterList[0]]
        ? chapters[chapterList[0]]
        : {},
  };
}

export default connect(mapStateToProps, {
  moveCard,
  shiftCards,
  removeCard,
})(ComicCard);
