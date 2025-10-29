let currentTab = null;
let campaigns = [];

// Initialize popup when opened
document.addEventListener('DOMContentLoaded', async () => {
  // Get the active tab
  [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Check if we're on the correct page
  if (currentTab.url && currentTab.url.includes('/formulaires')) {
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('wrongPage').style.display = 'none';
  } else {
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('wrongPage').style.display = 'block';
  }

  // Load saved dons ponctuels
  const data = await chrome.storage.local.get(['donsPonctuels']);
  if (data.donsPonctuels) {
    document.getElementById('donsPonctuels').value = data.donsPonctuels;
  }

  // Listen for progress updates from background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'progressUpdate') {
      updateProgress(request.data);
      sendResponse({ received: true });
    }
    return true;
  });
});

// Load campaigns button handler
document.getElementById('loadCampaignsBtn').addEventListener('click', async () => {
  try {
    showStatus('Loading campaigns...', 'info');

    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'getCampaigns'
    });

    if (response.success) {
      campaigns = response.campaigns;
      displayCampaigns(campaigns);
      showStatus(`Loaded ${campaigns.length} campaigns`, 'success');

      // Enable the add button if campaigns are loaded
      updateAddButtonState();
    } else {
      showStatus(response.error || 'Failed to load campaigns', 'error');
    }
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
  }
});

// Display campaigns with checkboxes
function displayCampaigns(campaigns) {
  const campaignsList = document.getElementById('campaignsList');
  campaignsList.innerHTML = '';

  if (campaigns.length === 0) {
    campaignsList.innerHTML = '<p class="no-campaigns">No campaigns found</p>';
    return;
  }

  campaigns.forEach((campaign, index) => {
    const campaignItem = document.createElement('div');
    campaignItem.className = 'campaign-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `campaign-${index}`;
    checkbox.className = 'campaign-checkbox';
    checkbox.dataset.index = index;
    checkbox.addEventListener('change', updateAddButtonState);

    const label = document.createElement('label');
    label.htmlFor = `campaign-${index}`;
    label.textContent = campaign.name;

    campaignItem.appendChild(checkbox);
    campaignItem.appendChild(label);
    campaignsList.appendChild(campaignItem);
  });
}

// Update the state of the add button
function updateAddButtonState() {
  const checkboxes = document.querySelectorAll('.campaign-checkbox:checked');
  const addBtn = document.getElementById('addDonsBtn');
  addBtn.disabled = checkboxes.length === 0;
}

// Add dons ponctuels button handler
document.getElementById('addDonsBtn').addEventListener('click', async () => {
  // Get selected campaigns
  const selectedCheckboxes = document.querySelectorAll('.campaign-checkbox:checked');
  const selectedCampaigns = Array.from(selectedCheckboxes).map(cb => {
    return campaigns[parseInt(cb.dataset.index)];
  });

  // Get dons ponctuels
  const donsPonctuelsInput = document.getElementById('donsPonctuels').value;
  const donsPonctuels = donsPonctuelsInput
    .split(',')
    .map(d => d.trim())
    .filter(d => d && !isNaN(d))
    .map(d => parseFloat(d));

  if (donsPonctuels.length === 0) {
    showStatus('Please enter valid donation amounts', 'error');
    return;
  }

  if (selectedCampaigns.length === 0) {
    showStatus('Please select at least one campaign', 'error');
    return;
  }

  // Save dons ponctuels for next time
  await chrome.storage.local.set({ donsPonctuels: donsPonctuelsInput });

  // Disable button during processing
  document.getElementById('addDonsBtn').disabled = true;
  document.getElementById('loadCampaignsBtn').disabled = true;

  // Show progress section
  document.getElementById('progress').style.display = 'block';
  document.getElementById('progressBar').style.width = '0%';
  document.getElementById('progressText').textContent = 'Starting automation...';
  showStatus('Starting automation...', 'info');

  try {
    // Send task to background worker
    const response = await chrome.runtime.sendMessage({
      action: 'startCampaignProcessing',
      data: {
        campaigns: selectedCampaigns,
        donsPonctuels: donsPonctuels,
        tabId: currentTab.id
      }
    });

    if (!response || !response.success) {
      showStatus('Failed to start processing: ' + (response?.error || 'Unknown error'), 'error');
      document.getElementById('addDonsBtn').disabled = false;
      document.getElementById('loadCampaignsBtn').disabled = false;
    }
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
    document.getElementById('addDonsBtn').disabled = false;
    document.getElementById('loadCampaignsBtn').disabled = false;
  }
});

// Update progress from background worker
function updateProgress(progressData) {
  const { status, current, total, message } = progressData;

  // Update progress bar
  const percentage = total > 0 ? ((current / total) * 100).toFixed(0) : 0;
  document.getElementById('progressBar').style.width = `${percentage}%`;
  document.getElementById('progressText').textContent = message;

  // Update status based on state
  if (status === 'running') {
    showStatus(message, 'info');
  } else if (status === 'complete') {
    showStatus(message, 'success');
    // Re-enable buttons
    setTimeout(() => {
      document.getElementById('addDonsBtn').disabled = false;
      document.getElementById('loadCampaignsBtn').disabled = false;
    }, 2000);
  } else if (status === 'error') {
    showStatus(message, 'error');
  }
}

// Show status message
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  if (type === 'success') {
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }, 3000);
  }
}
