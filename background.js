const SEARCH_BASE_URL = 'https://mydramalist.com/search?q=';
const MENU_ID = 'mdl-search';
const COMMAND_ID = 'search-mdl';
const MAX_OMNIBOX_SEARCHES = 3;
const MAX_POPUP_SEARCHES = 10;

const LOCALE_TEXT = {
  en: { menuTitle: 'Search "%s" on MyDramaList', omniboxDefault: 'Type your search query for MyDramaList', omniboxSuggestion: 'Search "%s" on MyDramaList', omniboxRecent: 'Recent: %s' },
  ko: { menuTitle: '"%s"을(를) MyDramaList에서 검색', omniboxDefault: 'MyDramaList 검색어를 입력하세요', omniboxSuggestion: '"%s"을(를) MyDramaList에서 검색', omniboxRecent: '최근: %s' },
  zh: { menuTitle: '在MyDramaList上搜索“%s”', omniboxDefault: '输入MyDramaList搜索查询', omniboxSuggestion: '在MyDramaList上搜索“%s”', omniboxRecent: '最近: %s' }
};

const userLanguage = (navigator.language || 'en').startsWith('ko') ? 'ko' : (navigator.language || 'en').startsWith('zh') ? 'zh' : 'en';
const TEXT = LOCALE_TEXT[userLanguage];

let activeTabId = null;
let lastActiveTime = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: TEXT.menuTitle,
    contexts: ['selection'],
    documentUrlPatterns: ['http://*/*', 'https://*/*']
  });
});

function performSearch(query, isContextMenu = false, tab = null, updateCurrentTab = false) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery || typeof trimmedQuery !== 'string') return;

  const searchUrl = `${SEARCH_BASE_URL}${encodeURIComponent(trimmedQuery)}`;
  if ((isContextMenu || updateCurrentTab) && tab && tab.url && tab.url.includes('mydramalist.com')) {
    chrome.tabs.update(tab.id, { url: searchUrl });
  } else {
    chrome.tabs.create({ url: searchUrl, active: true });
  }

  chrome.storage.local.get(['recentSearches'], (result) => {
    let searches = result.recentSearches || [];
    searches = searches.filter(s => s !== trimmedQuery);
    searches.unshift(trimmedQuery);
    if (searches.length > MAX_POPUP_SEARCHES) searches.pop();
    chrome.storage.local.set({ recentSearches: searches });
  });
}

function checkAndResetTime() {
  const now = new Date();
  const today = now.toDateString();
  chrome.storage.local.get(['mdlTimeSpent', 'lastResetDate'], (result) => {
    if (result.lastResetDate !== today) {
      chrome.storage.local.set({ mdlTimeSpent: 0, lastResetDate: today });
    }
  });
}

function updateTimeSpent() {
  if (activeTabId === null || !lastActiveTime) return;
  const now = Date.now();
  const timeDiff = now - lastActiveTime;
  lastActiveTime = now;
  chrome.storage.local.get(['mdlTimeSpent'], (result) => {
    const currentTime = result.mdlTimeSpent || 0;
    chrome.storage.local.set({ mdlTimeSpent: currentTime + timeDiff });
  });
}

checkAndResetTime();

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    checkAndResetTime();
    if (tab.url && tab.url.includes('mydramalist.com')) {
      if (activeTabId !== activeInfo.tabId) {
        updateTimeSpent();
        activeTabId = activeInfo.tabId;
        lastActiveTime = Date.now();
      }
    } else {
      updateTimeSpent();
      activeTabId = null;
      lastActiveTime = null;
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.url) {
    checkAndResetTime();
    if (changeInfo.url.includes('mydramalist.com')) {
      if (activeTabId !== tabId) {
        updateTimeSpent();
        activeTabId = tabId;
        lastActiveTime = Date.now();
      }
    } else {
      updateTimeSpent();
      activeTabId = null;
      lastActiveTime = null;
    }
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  checkAndResetTime();
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    updateTimeSpent();
    activeTabId = null;
    lastActiveTime = null;
  } else {
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('mydramalist.com')) {
        if (activeTabId !== tabs[0].id) {
          updateTimeSpent();
          activeTabId = tabs[0].id;
          lastActiveTime = Date.now();
        }
      }
    });
  }
});

function checkNotifications(isStartup = false) {
  chrome.storage.local.get(['episodeNotifications', 'expiredNotifications'], (result) => {
    let notifications = result.episodeNotifications || [];
    let expiredNotifications = result.expiredNotifications || [];
    const now = Date.now();
    const toExpire = [];

    notifications.forEach((notif, index) => {
      if (notif.releaseTime <= now) {
        const notificationId = `episode_${encodeURIComponent(notif.title)}_${index}`;
        const messageType = isStartup ? 'missed' : 'new';
        console.log('Creating notification:', { id: notificationId, title: notif.title, url: notif.url });
        chrome.notifications.create(
          notificationId,
          {
            type: 'image',
            iconUrl: 'icon48.png',
            title: `${notif.title} - ${isStartup ? 'Missed' : 'New'} Episode!`,
            message: isStartup
              ? 'You missed it! The episode has already released.'
              : 'The next episode is now available.',
            imageUrl: notif.imageUrl || 'icon128.png'
          },
          (id) => {
            if (chrome.runtime.lastError) {
              console.error('Notification failed:', chrome.runtime.lastError);
            }
          }
        );
        toExpire.push(index);
        expiredNotifications.push({ ...notif, notificationId, expiredAt: now });
      }
    });

    if (toExpire.length > 0) {
      toExpire.sort((a, b) => b - a);
      toExpire.forEach((index) => notifications.splice(index, 1));
    }

    expiredNotifications = expiredNotifications.filter(
      (n) => now - n.expiredAt < 50 * 60 * 60 * 1000 // Keep for 50 hours
    );

    chrome.storage.local.set({
      episodeNotifications: notifications,
      expiredNotifications: expiredNotifications
    }, () => {
      console.log('Notifications updated:', { active: notifications.length, expired: expiredNotifications.length });
    });
  });
}

chrome.alarms.create('checkEpisodeRelease', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkEpisodeRelease') {
    checkNotifications(false);
  }
});

chrome.runtime.onStartup.addListener(() => {
  checkNotifications(true);
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('episode_')) {
    chrome.storage.local.get(['episodeNotifications', 'expiredNotifications'], (result) => {
      const notifications = result.episodeNotifications || [];
      const expiredNotifications = result.expiredNotifications || [];
      const allNotifications = [...notifications, ...expiredNotifications];
      const notif = allNotifications.find((n) => n.notificationId === notificationId) || {};
      
      const redirectUrl = notif.url || `${SEARCH_BASE_URL}${encodeURIComponent(notif.title || '')}`;
      console.log('Notification clicked:', { notificationId, url: notif.url, redirectUrl });
      if (redirectUrl) {
        chrome.tabs.create({ url: redirectUrl });
      } else {
        console.warn('No valid redirect URL found for notification:', notificationId);
      }
    });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID && info.selectionText) {
    performSearch(info.selectionText, true, tab);
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === COMMAND_ID) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => window.getSelection().toString()
        }, (results) => {
          if (results?.[0]?.result) performSearch(results[0].result);
        });
      }
    });
  }
});

chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({ description: TEXT.omniboxDefault });
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const trimmedText = text.trim();
  if (!trimmedText) return;

  chrome.storage.local.get(['recentSearches'], (result) => {
    const recentSearches = (result.recentSearches || []).slice(0, MAX_OMNIBOX_SEARCHES);
    const suggestions = [{ content: trimmedText, description: TEXT.omniboxSuggestion.replace('%s', trimmedText) }];
    recentSearches.forEach((search) => {
      suggestions.push({ content: search, description: TEXT.omniboxRecent.replace('%s', search) });
    });
    suggest(suggestions);
  });
});

chrome.omnibox.onInputEntered.addListener((text) => {
  performSearch(text.trim());
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'search' && message.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      performSearch(message.query, false, tabs[0], message.updateCurrentTab || false);
      sendResponse({ success: true });
    });
    return true;
  } else if (message.action === 'deleteNotification' && message.title) {
    chrome.storage.local.get(['episodeNotifications'], (result) => {
      const notifications = result.episodeNotifications || [];
      const updatedNotifications = notifications.filter((n) => n.title !== message.title);
      chrome.storage.local.set({ episodeNotifications: updatedNotifications }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
});