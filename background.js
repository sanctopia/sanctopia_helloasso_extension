// Background service worker for HelloAsso Form Automator

// Initialize extension on install
chrome.runtime.onInstalled.addListener((details) => {
  console.log('HelloAsso Form Automator installed', details);

  if (details.reason === 'install') {
    // Set default values on first install
    chrome.storage.local.set({
      formTemplate: {
        title: '',
        description: '',
        targetAmount: '',
        formType: 'donation'
      }
    });
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  // Handle any background tasks here
  if (request.action === 'log') {
    console.log(request.message);
    sendResponse({ received: true });
  }

  if (request.action === 'startCampaignProcessing') {
    // Start processing campaigns in background
    processCampaigns(request.data.campaigns, request.data.donsPonctuels, request.data.tabId)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  sendResponse({ received: true });
  return true;
});

// Process campaigns one by one
async function processCampaigns(campaigns, donsPonctuels, tabId) {
  console.log('Starting campaign processing:', campaigns.length, 'campaigns');

  // Send initial progress
  sendProgressUpdate({
    status: 'running',
    current: 0,
    total: campaigns.length,
    message: 'Starting automation...'
  });

  for (let i = 0; i < campaigns.length; i++) {
    const campaign = campaigns[i];
    console.log(`Processing campaign ${i + 1}/${campaigns.length}: ${campaign.name}`);

    // Send progress update
    sendProgressUpdate({
      status: 'running',
      current: i,
      total: campaigns.length,
      message: `Processing ${i + 1}/${campaigns.length}: ${campaign.name}`,
      campaignName: campaign.name
    });

    try {
      // Navigate to the campaign edit page
      await chrome.tabs.update(tabId, { url: campaign.editUrl });

      // Wait for page to fully load
      await waitForTabLoad(tabId);

      // Additional wait to ensure content script is injected
      await sleep(1000);

      // Retry logic for sending message
      let response = null;
      let retries = 3;

      while (retries > 0 && !response) {
        try {
          response = await chrome.tabs.sendMessage(tabId, {
            action: 'addDonsPonctuels',
            data: {
              donsPonctuels: donsPonctuels,
              campaignIndex: i,
              totalCampaigns: campaigns.length
            }
          });

          if (response && response.success) {
            console.log(`Successfully processed ${campaign.name}`);
          } else {
            console.error(`Failed to process ${campaign.name}:`, response?.error);
          }
          break;
        } catch (error) {
          retries--;
          if (retries > 0) {
            console.log(`Retry sending message (${retries} retries left)...`);
            await sleep(1000);
          } else {
            throw error;
          }
        }
      }

      // Wait a bit before next campaign
      await sleep(500);
    } catch (error) {
      console.error(`Error processing ${campaign.name}:`, error);
      sendProgressUpdate({
        status: 'error',
        current: i,
        total: campaigns.length,
        message: `Error on ${campaign.name}: ${error.message}`,
        campaignName: campaign.name
      });
    }
  }

  console.log('All campaigns processed');

  // Send completion update
  sendProgressUpdate({
    status: 'complete',
    current: campaigns.length,
    total: campaigns.length,
    message: `Completed all ${campaigns.length} campaigns! Redirecting...`
  });

  // Redirect to formulaires page
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab && tab.url) {
      // Extract the base URL and slug from current URL
      const match = tab.url.match(/(https?:\/\/[^/]+\/[^/]+)\/formulaires/);
      if (match) {
        const baseUrl = match[1];
        await chrome.tabs.update(tabId, { url: `${baseUrl}/formulaires` });
        console.log('Redirected to formulaires page');
      }
    }
  } catch (error) {
    console.error('Error redirecting to formulaires page:', error);
  }
}

// Send progress update to any listening popups
function sendProgressUpdate(progressData) {
  chrome.runtime.sendMessage({
    action: 'progressUpdate',
    data: progressData
  }).catch(() => {
    // Popup might be closed, ignore error
  });
}

// Helper function to wait for tab to load
function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    const checkLoad = (id, changeInfo) => {
      if (id === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(checkLoad);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(checkLoad);

    // Fallback timeout
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(checkLoad);
      resolve();
    }, 10000);
  });
}

// Helper function for sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Optional: Update badge or icon based on current tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);

    if (tab.url && tab.url.includes('helloasso.com')) {
      // Set a badge to indicate the extension is active on this page
      chrome.action.setBadgeText({
        text: '✓',
        tabId: tab.id
      });
      chrome.action.setBadgeBackgroundColor({
        color: '#4a90e2',
        tabId: tab.id
      });
    } else {
      chrome.action.setBadgeText({
        text: '',
        tabId: tab.id
      });
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
});

console.log('HelloAsso Form Automator background service worker initialized');
