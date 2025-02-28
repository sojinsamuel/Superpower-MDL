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
  const formFeedback = document.getElementById('form-feedback');
  const notificationsMenu = document.getElementById('notifications-menu');
  const notificationsList = document.getElementById('notifications-list');
  const tabRecent = document.getElementById('tab-recent');
  const tabNotifications = document.getElementById('tab-notifications');
  const sortNotifications = document.getElementById('sort-notifications');

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
    return (parseInt(days || 0) * 86400000) + 
           (parseInt(hours || 0) * 3600000) + 
           (parseInt(mins || 0) * 60000) + 
           (parseInt(secs || 0) * 1000);
  }

  function isValidUrl(url) {
    return url === '' || /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i.test(url);
  }

  function scheduleNotification(title, imageUrl, timerMs, url = '', isForm = false) {
    if (timerMs <= 0) {
      if (isForm) {
        formFeedback.textContent = `No upcoming episode to notify for "${title}"`;
        formFeedback.style.display = 'block';
        setTimeout(() => { formFeedback.style.display = 'none'; }, 2000);
      } else {
        switchTab(tabNotifications, tabRecent, notificationsMenu, list);
        notificationsList.innerHTML = '<div class="notification-item">No upcoming episode to notify for "' + title + '"</div>';
        setTimeout(updateNotificationsList, 2000);
      }
      return false;
    }

    const releaseTime = Date.now() + timerMs;
    return new Promise((resolve) => {
      chrome.storage.local.get(['episodeNotifications'], (result) => {
        const notifications = result.episodeNotifications || [];
        const existingIndex = notifications.findIndex(n => n.title === title);
        if (existingIndex !== -1) {
          if (isForm) {
            console.log('Duplicate detected in form:', title);
            formFeedback.textContent = `Notification already exists for "${title}" or update the title to support multiple eps of a drama`;
            formFeedback.style.display = 'block';
            setTimeout(() => { formFeedback.style.display = 'none'; }, 3000);
          } else {
            switchTab(tabNotifications, tabRecent, notificationsMenu, list);
            notificationsList.innerHTML = `<div class="notification-item">Notification already exists for "${title}"</div>`;
            setTimeout(() => {
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
            }, 2000);
          }
          resolve(false);
          return;
        }
        const notificationData = { title, imageUrl, releaseTime, url };
        notifications.unshift(notificationData);
        console.log('Storing notification:', notificationData);
        chrome.storage.local.set({ episodeNotifications: notifications }, () => {
          updateNotificationsList();
          if (imageUrl && !isForm) {
            switchTab(tabNotifications, tabRecent, notificationsMenu, list);
          }
          resolve(true);
        });
      });
    });
  }

  function updateNotificationsList(callback) {
    chrome.storage.local.get(['episodeNotifications', 'sortPreference'], (result) => {
      let notifications = result.episodeNotifications || [];
      const sortPreference = result.sortPreference || 'default';

      // Apply sorting based on preference
      if (sortPreference === 'soon') {
        notifications.sort((a, b) => a.releaseTime - b.releaseTime); // Earliest first
      } // Default keeps original order (newest first)

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

  function deleteRecentSearch(searchQuery) {
    chrome.storage.local.get(['recentSearches'], (result) => {
      let searches = result.recentSearches || [];
      searches = searches.filter(s => s !== searchQuery);
      chrome.storage.local.set({ recentSearches: searches }, () => {
        updateRecentSearches();
      });
    });
  }

  function updateRecentSearches() {
    chrome.storage.local.get(['recentSearches'], (result) => {
      const searches = result.recentSearches || [];
      list.innerHTML = '';
      if (searches.length === 0) {
        list.innerHTML = '<div class="search-item">No recent searches</div>';
      } else {
        searches.slice(0, 10).forEach((search, index) => {
          const div = document.createElement('div');
          div.className = 'search-item';
          div.innerHTML = `
            <span class="search-text">${search}</span>
            <button class="delete-search-btn">X</button>
          `;
          div.style.animationDelay = `${index * 0.05}s`;
          div.querySelector('.search-text').addEventListener('click', () => {
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
          div.querySelector('.delete-search-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteRecentSearch(search);
          });
          list.appendChild(div);
        });
      }
    });
  }

  function getCurrentTabUrl(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || '';
      callback(url);
    });
  }

  chrome.storage.local.get(['recentSearches', 'mdlTimeSpent', 'episodeNotifications', 'sortPreference'], (result) => {
    const searches = result.recentSearches || [];
    const timeSpent = result.mdlTimeSpent || 0;
    const notifications = result.episodeNotifications || [];
    const sortPreference = result.sortPreference || 'default';

    timeSpan.textContent = `Today: ${formatTime(timeSpent)}`;

    // Set initial sort preference
    sortNotifications.value = sortPreference;

    updateRecentSearches();

    notifyBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || !tabs[0].url || (!tabs[0].url.startsWith('http://') && !tabs[0].url.startsWith('https://'))) {
          notifyForm.style.display = 'block';
          list.style.display = 'none';
          notificationsMenu.style.display = 'none';
          
          getCurrentTabUrl((url) => {
            formUrl.value = url;
          });

          formSubmit.onclick = async (event) => {
            event.preventDefault();
            const title = formTitle.value.trim();
            const days = formDays.value;
            const hours = formHours.value;
            const mins = formMins.value;
            const url = formUrl.value.trim();

            console.log('Form submitted:', { title, days, hours, mins, url });

            if (!title) {
              formFeedback.textContent = 'Please enter a drama title.';
              formFeedback.style.display = 'block';
              setTimeout(() => { formFeedback.style.display = 'none'; }, 2000);
              return;
            }
            if (!isValidUrl(url)) {
              formFeedback.textContent = 'Please enter a valid URL (e.g., https://streamingplatform.com/episode) or leave it blank.';
              formFeedback.style.display = 'block';
              setTimeout(() => { formFeedback.style.display = 'none'; }, 2000);
              return;
            }

            const daysValue = parseInt(days || 0);
            const hoursValue = parseInt(hours || 0);
            const minsValue = parseInt(mins || 0);
            if (daysValue === 0 && hoursValue === 0 && minsValue === 0) {
              formFeedback.textContent = 'Please set at least one timer field (Days, Hours, or Minutes) to a value greater than 0.';
              formFeedback.style.display = 'block';
              setTimeout(() => { formFeedback.style.display = 'none'; }, 2000);
              return;
            }

            const timerMs = parseTimer(days, hours, mins);
            const success = await scheduleNotification(title, '', timerMs, url, true);
            if (success) {
              switchTab(tabNotifications, tabRecent, notificationsMenu, list);
              notifyForm.style.display = 'none';
            }
          };

          formCancel.onclick = () => {
            switchTab(tabRecent, tabNotifications, list, notificationsMenu);
          };
          return;
        }

        switchTab(tabNotifications, tabRecent, notificationsMenu, list);
        notificationsList.innerHTML = '<div class="notification-item">Loading...</div>';

        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            const countdown = document.querySelector('.countdown');
            if (countdown) {
              countdown.scrollIntoView({ behavior: 'smooth', block: 'center' });
              return new Promise(resolve => setTimeout(resolve, 2000)).then(() => {
                const title = document.querySelector('.film-title a')?.textContent || '';
                const imageUrl = document.querySelector('.film-cover img')?.src || '';
                const days = document.querySelector('.countdown .days .value')?.textContent || '0';
                const hours = document.querySelector('.countdown .hours .value')?.textContent || '0';
                const mins = document.querySelector('.countdown .mins .value')?.textContent || '0';
                const secs = document.querySelector('.countdown .secs .value')?.textContent || '0';
                return { title, imageUrl, days, hours, mins, secs };
              });
            }
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
            
            getCurrentTabUrl((url) => {
              formUrl.value = url;
            });

            formSubmit.onclick = async (event) => {
              event.preventDefault();
              const title = formTitle.value.trim();
              const days = formDays.value;
              const hours = formHours.value;
              const mins = formMins.value;
              const url = formUrl.value.trim();

              console.log('Form submitted (manual):', { title, days, hours, mins, url });

              if (!title) {
                formFeedback.textContent = 'Please enter a drama title.';
                formFeedback.style.display = 'block';
                setTimeout(() => { formFeedback.style.display = 'none'; }, 2000);
                return;
              }
              if (!isValidUrl(url)) {
                formFeedback.textContent = 'Please enter a valid URL (e.g., https://streamingplatform.com/episode) or leave it blank.';
                formFeedback.style.display = 'block';
                setTimeout(() => { formFeedback.style.display = 'none'; }, 2000);
                return;
              }

              const daysValue = parseInt(days || 0);
              const hoursValue = parseInt(hours || 0);
              const minsValue = parseInt(mins || 0);
              if (daysValue === 0 && hoursValue === 0 && minsValue === 0) {
                formFeedback.textContent = 'Please set at least one timer field (Days, Hours, or Minutes) to a value greater than 0.';
                formFeedback.style.display = 'block';
                setTimeout(() => { formFeedback.style.display = 'none'; }, 2000);
                return;
              }

              const timerMs = parseTimer(days, hours, mins);
              const success = await scheduleNotification(title, '', timerMs, url, true);
              if (success) {
                switchTab(tabNotifications, tabRecent, notificationsMenu, list);
                notifyForm.style.display = 'none';
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
              
              getCurrentTabUrl((url) => {
                formUrl.value = url;
              });

              formSubmit.onclick = async (event) => {
                event.preventDefault();
                const title = formTitle.value.trim();
                const days = formDays.value;
                const hours = formHours.value;
                const mins = formMins.value;
                const url = formUrl.value.trim();

                console.log('Form submitted (fallback):', { title, days, hours, mins, url });

                if (!title) {
                  formFeedback.textContent = 'Please enter a drama title.';
                  formFeedback.style.display = 'block';
                  setTimeout(() => { formFeedback.style.display = 'none'; }, 2000);
                  return;
                }
                if (!isValidUrl(url)) {
                  formFeedback.textContent = 'Please enter a valid URL (e.g., https://streamingplatform.com/episode) or leave it blank.';
                  formFeedback.style.display = 'block';
                  setTimeout(() => { formFeedback.style.display = 'none'; }, 2000);
                  return;
                }

                const daysValue = parseInt(days || 0);
                const hoursValue = parseInt(hours || 0);
                const minsValue = parseInt(mins || 0);
                if (daysValue === 0 && hoursValue === 0 && minsValue === 0) {
                  formFeedback.textContent = 'Please set at least one timer field (Days, Hours, or Minutes) to a value greater than 0.';
                  formFeedback.style.display = 'block';
                  setTimeout(() => { formFeedback.style.display = 'none'; }, 2000);
                  return;
                }

                const timerMs = parseTimer(days, hours, mins);
                const success = await scheduleNotification(title, '', timerMs, url, true);
                if (success) {
                  switchTab(tabNotifications, tabRecent, notificationsMenu, list);
                  notifyForm.style.display = 'none';
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

    // Handle sort preference change
    sortNotifications.addEventListener('change', () => {
      const sortPreference = sortNotifications.value;
      chrome.storage.local.set({ sortPreference }, () => {
        updateNotificationsList();
      });
    });

    updateNotificationsList();
  });
});