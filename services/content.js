'use strict';

global.document = {
  getElementsByTagName: () => {
    return [{}];
  }
};

const _ = require('lodash');
const { appID, isProduction } = require('../config');
const SDK = require('./rumble-sdk.min');
const { StatusBarIOS, Platform, AsyncStorage } = require('react-native');

let isSDKInitialized = false;
SDK.initialize({appID, isProduction}).then(() => {
  isSDKInitialized = true;
});

const DEFAULT_CACHE_TIME = 1800;

const cache = function(id, cacheTime, loader) {
  id = appID.toString() + id.toString();
  if (_.isFunction(cacheTime)) {
    loader = cacheTime;
    cacheTime = DEFAULT_CACHE_TIME;
  }
  return AsyncStorage.getItem(id).then(result => {

    let now = new Date().getTime();
    try {
      result = JSON.parse(result);
    } catch (e) {
      result = null;
    }

    if (result && result.timestamp && (now - result.timestamp) < cacheTime * 1000) {
      // getting from cache
      console.log(id, 'from cache');
      return result.data;
    } else {
      // loading
      if (Platform.OS === 'ios') {
        StatusBarIOS.setNetworkActivityIndicatorVisible(true);
      }
      return loader().then(result => {
        console.log(id, 'loaded');
        if (Platform.OS === 'ios') {
          StatusBarIOS.setNetworkActivityIndicatorVisible(false);
        }
        AsyncStorage.setItem(id, JSON.stringify({
          timestamp: new Date().getTime(),
          data: result
        }));
        return result;
      });
    }
  });
};

module.exports = {

  loadChannelsList: () => cache('channelsList',
    () => SDK.Content.getChannels('list')
  ),

  loadChannelsTree: () => cache('channelsTree',
    () => SDK.Content.getChannels('tree')
  ),

  loadChannelsSections: () => cache('channelsSections',
    () => SDK.Content.getChannels('sections')
  ),

  loadOnlyChannelsList: () => cache('justChannels',
    () => SDK.Content.getChannels('list')
      .then(channels => _.filter(channels, {type: 'channel'}))
  ),

  loadChannel: (id) => cache('channel' + id,
    () => SDK.Content.getChannel(id)
  ),

  loadArticle: (id) => cache('article' + id,
    () => SDK.Content.getArticle(id)
  )

};
