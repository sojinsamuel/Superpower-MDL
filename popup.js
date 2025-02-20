document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('recent-searches');
  const timeSpan = document.getElementById('time-spent');
  const notifyBtn = document.getElementById('notify-btn');
  const notifyForm = document.getElementById('notify-form');
  const formTitle = document.getElementById('form-title');
  const formDays = document.getElementById('form-days');
  const formHours = document.getElementById('form-hours');
  const formMins = document.getElementById('form-mins');
  const formUrl = document.getElementById('form-url');
  const formSubmit = document.getElementById('form-submit');
  const formCancel = document.getElementById('form-cancel');
  const notificationsMenu = document.getElementById('notifications-menu');
  const notificationsList = document.getElementById('notifications-list');
  const tabRecent = document.getElementById('tab-recent');
  const tabNotifications = document.getElementById('tab-notifications');

  function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    return days > 0 ? `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s` : 
           hours > 0 ? `${hours}h ${minutes % 60}m ${seconds % 60}s` : 
           minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  }

  function parseTimer(days, hours, mins, secs = 0) {
    return (parseInt(days || 0) * 86400000) + (parseInt(hours || 0) * 3600000) + (parseInt(mins || 0) * 60000) + (parseInt(secs || 0) * 1000);
  }

  function isValidUrl(url) {
    return url === '' || /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i.test(url);
  }

  function scheduleNotification(title, imageUrl, timerMs, url = '') {
    if (timerMs <= 0) {
      switchTab(tabNotifications, tabRecent, notificationsMenu, list);
      notificationsList.innerHTML = '<div class="notification-item">No upcoming episode to notify for "' + title + '"</div>';
      setTimeout(updateNotificationsList, 2000);
      return;
    }

    const releaseTime = Date.now() + timerMs;
    chrome.storage.local.get(['episodeNotifications'], (result) => {
      const notifications = result.episodeNotifications || [];
      const existingIndex = notifications.findIndex(n => n.title === title);
      if (existingIndex !== -1) {
        switchTab(tabNotifications, tabRecent, notificationsMenu, list);
        updateNotificationsList(() => {
          const items = notificationsList.getElementsByClassName('notification-item');
          for (let item of items) {
            if (item.textContent.includes(title)) {
              item.classList.add('duplicate-pulse');
              setTimeout(() => item.classList.remove('duplicate-pulse'), 500);
              break;
            }
          }
        });
        return;
      }
      notifications.unshift({ title, imageUrl, releaseTime, url });
      chrome.storage.local.set({ episodeNotifications: notifications }, () => {
        updateNotificationsList();
        if (imageUrl) {
          switchTab(tabNotifications, tabRecent, notificationsMenu, list);
        }
      });
    });
  }

  function updateNotificationsList(callback) {
    chrome.storage.local.get(['episodeNotifications'], (result) => {
      const notifications = result.episodeNotifications || [];
      notificationsList.innerHTML = '';
      if (notifications.length === 0) {
        notificationsList.innerHTML = '<div class="notification-item">No notifications set</div>';
        return;
      }

      notifications.forEach((notif, index) => {
        const timeLeft = Math.max(0, notif.releaseTime - Date.now());
        const div = document.createElement('div');
        div.className = 'notification-item';
        div.innerHTML = `${notif.title} (${formatTime(timeLeft)}) <button class="delete-btn">Delete</button>`;
        div.style.animationDelay = `${index * 0.05}s`;
        
        if (notif.url) {
          div.style.cursor = 'pointer';
          div.addEventListener('click', (e) => {
            if (e.target.className !== 'delete-btn') {
              chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const isMdlTab = tabs[0]?.url?.includes('mydramalist.com');
                if (isMdlTab) {
                  chrome.tabs.update(tabs[0].id, { url: notif.url });
                } else {
                  chrome.tabs.create({ url: notif.url, active: true });
                }
                window.close();
              });
            }
          });
        }

        div.querySelector('.delete-btn').addEventListener('click', () => {
          chrome.runtime.sendMessage({ action: 'deleteNotification', title: notif.title });
          setTimeout(updateNotificationsList, 50);
        });
        notificationsList.appendChild(div);
      });
      if (callback) callback();
    });
  }

  function switchTab(activeTab, inactiveTab, activePane, inactivePane) {
    activeTab.classList.add('active');
    inactiveTab.classList.remove('active');
    activePane.style.display = 'flex';
    inactivePane.style.display = 'none';
    notifyForm.style.display = 'none';
  }

  chrome.storage.local.get(['recentSearches', 'mdlTimeSpent', 'episodeNotifications'], (result) => {
    const searches = result.recentSearches || [];
    const timeSpent = result.mdlTimeSpent || 0;
    const notifications = result.episodeNotifications || [];

    timeSpan.textContent = `Today: ${formatTime(timeSpent)}`;

    if (searches.length === 0) {
      list.innerHTML = '<div class="search-item">No recent searches</div>';
    } else {
      searches.slice(0, 10).forEach((search, index) => {
        const div = document.createElement('div');
        div.className = 'search-item';
        div.textContent = search;
        div.style.animationDelay = `${index * 0.05}s`;
        div.addEventListener('click', () => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const isMdlTab = tabs[0]?.url?.includes('mydramalist.com');
            chrome.runtime.sendMessage({ 
              action: 'search', 
              query: search, 
              updateCurrentTab: isMdlTab
            });
            window.close();
          });
        });
        list.appendChild(div);
      });
    }

    notifyBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || !tabs[0].url || (!tabs[0].url.startsWith('http://') && !tabs[0].url.startsWith('https://'))) {
          notifyForm.style.display = 'block';
          list.style.display = 'none';
          notificationsMenu.style.display = 'none';
          formSubmit.onclick = () => {
            const title = formTitle.value.trim();
            const timerMs = parseTimer(formDays.value, formHours.value, formMins.value);
            const url = formUrl.value.trim();
            if (title && isValidUrl(url)) {
              scheduleNotification(title, '', timerMs, url);
              switchTab(tabNotifications, tabRecent, notificationsMenu, list);
              notifyForm.style.display = 'none';
              updateNotificationsList();
            } else if (!isValidUrl(url)) {
              alert('Please enter a valid URL (e.g., https://streamingplatform.com/episode) or leave it blank.');
            }
          };
          formCancel.onclick = () => {
            switchTab(tabRecent, tabNotifications, list, notificationsMenu);
          };
          return;
        }

        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            const title = document.querySelector('.film-title a')?.textContent || '';
            const imageUrl = document.querySelector('.film-cover img')?.src || '';
            const days = document.querySelector('.countdown .days .value')?.textContent || '0';
            const hours = document.querySelector('.countdown .hours .value')?.textContent || '0';
            const mins = document.querySelector('.countdown .mins .value')?.textContent || '0';
            const secs = document.querySelector('.countdown .secs .value')?.textContent || '0';
            return { title, imageUrl, days, hours, mins, secs };
          }
        }, (results) => {
          if (chrome.runtime.lastError) {
            console.error('Script execution failed:', chrome.runtime.lastError);
            notifyForm.style.display = 'block';
            list.style.display = 'none';
            notificationsMenu.style.display = 'none';
            formSubmit.onclick = () => {
              const title = formTitle.value.trim();
              const timerMs = parseTimer(formDays.value, formHours.value, formMins.value);
              const url = formUrl.value.trim();
              if (title && isValidUrl(url)) {
                scheduleNotification(title, '', timerMs, url);
                switchTab(tabNotifications, tabRecent, notificationsMenu, list);
                notifyForm.style.display = 'none';
                updateNotificationsList();
              } else if (!isValidUrl(url)) {
                alert('Please enter a valid URL (e.g., https://streamingplatform.com/episode) or leave it blank.');
              }
            };
            formCancel.onclick = () => {
              switchTab(tabRecent, tabNotifications, list, notificationsMenu);
            };
            return;
          }

          if (results && results[0].result) {
            const { title, imageUrl, days, hours, mins, secs } = results[0].result;
            if (title && (days !== '0' || hours !== '0' || mins !== '0' || secs !== '0')) {
              const timerMs = parseTimer(days, hours, mins, secs);
              const url = tabs[0].url;
              scheduleNotification(title, imageUrl, timerMs, url);
            } else {
              notifyForm.style.display = 'block';
              list.style.display = 'none';
              notificationsMenu.style.display = 'none';
              formTitle.value = title || '';
              formSubmit.onclick = () => {
                const title = formTitle.value.trim();
                const timerMs = parseTimer(formDays.value, formHours.value, formMins.value);
                const url = formUrl.value.trim();
                if (title && isValidUrl(url)) {
                  scheduleNotification(title, '', timerMs, url);
                  switchTab(tabNotifications, tabRecent, notificationsMenu, list);
                  notifyForm.style.display = 'none';
                  updateNotificationsList();
                } else if (!isValidUrl(url)) {
                  alert('Please enter a valid URL (e.g., https://streamingplatform.com/episode) or leave it blank.');
                }
              };
              formCancel.onclick = () => {
                switchTab(tabRecent, tabNotifications, list, notificationsMenu);
              };
            }
          }
        });
      });
    });

    tabRecent.addEventListener('click', () => switchTab(tabRecent, tabNotifications, list, notificationsMenu));
    tabNotifications.addEventListener('click', () => {
      switchTab(tabNotifications, tabRecent, notificationsMenu, list);
      updateNotificationsList();
    });

    updateNotificationsList();
  });
});
