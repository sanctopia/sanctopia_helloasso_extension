// Content script for HelloAsso form automation

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCampaigns') {
    getCampaigns()
      .then(campaigns => sendResponse({ success: true, campaigns }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'addDonsPonctuels') {
    addDonsPonctuels(request.data.donsPonctuels, request.data.donPonctuelFavori)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  return true;
});

// Get all campaigns from the page
async function getCampaigns() {
  // Wait for page to be ready
  if (document.readyState !== 'complete') {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const campaignCards = document.querySelectorAll('[data-test="card-campaign"]');
  const campaigns = [];

  campaignCards.forEach(card => {
    const nameElement = card.querySelector('[data-test="card-campaign-name"]');
    const linkElement = card.querySelector('[data-test="link-edit-campaign"]');

    if (nameElement && linkElement) {
      campaigns.push({
        name: nameElement.textContent.trim(),
        editUrl: linkElement.href
      });
    }
  });

  console.log('Found campaigns:', campaigns);
  return campaigns;
}

// Add dons ponctuels to a campaign
async function addDonsPonctuels(donsPonctuels, donPonctuelFavori = null) {
  console.log('Starting to add dons ponctuels:', donsPonctuels);
  console.log('Don ponctuel favori:', donPonctuelFavori);

  try {
    // Step 1: Click on pathway item 2
    console.log('Step 1: Clicking pathway item 2');
    const pathwayItem = await waitForElement('li[data-testid="pathway-item-2"]', 10000);
    pathwayItem.click();

    // Step 2: Wait for add tier button to appear
    console.log('Step 2: Waiting for add tier button');
    await waitForElement('button[data-testid="button-add-tier"]', 10000);

    // Step 2.5: Get existing donation amounts to avoid duplicates
    console.log('Step 2.5: Checking existing donation amounts');
    // Wait a bit to ensure the table is fully loaded
    await sleep(500);

    const existingAmounts = new Set();
    const priceElements = document.querySelectorAll('table[data-testid="tab-active-single-tiers"] [data-test="row-tier-data-price"]');
    console.log('Found price elements:', priceElements.length);
    priceElements.forEach(el => {
      const amount = parseInt(el.textContent);
      console.log('Parsing amount from:', el.textContent, '→', amount);
      if (!isNaN(amount)) {
        existingAmounts.add(amount);
      }
    });
    console.log('Existing amounts:', Array.from(existingAmounts));

    // Filter out amounts that already exist
    const amountsToAdd = donsPonctuels.filter(amount => !existingAmounts.has(amount));
    console.log('Amounts to add:', amountsToAdd);

    if (amountsToAdd.length > 0) {
      console.log('Some donation amounts do not exist, adding...');

      // Step 3: Add each don ponctuel
      for (let i = 0; i < amountsToAdd.length; i++) {
        const amount = amountsToAdd[i];
        console.log(`Step 3.${i + 1}: Adding don ponctuel ${amount}`);

        // 3.a: Click add tier button
        const addTierBtn = await waitForElement('button[data-testid="button-add-tier"]', 5000);
        addTierBtn.click();

        // 3.b: Wait for modal to appear
        await waitForElement('[data-test="ha-modal"]', 5000);

        // 3.c: Click single donation type
        const singleBtn = await waitForElement('button[data-testid="button-tier-type-single"]', 5000);
        singleBtn.click();

        // 3.d: Input the amount (simulate keyboard input)
        const priceInput = await waitForElement('input[data-testid="input-tier-price"]', 5000);
        await simulateKeyboardInput(priceInput, amount.toString());

        // 3.d.1: Ensure tax receipt checkbox is checked
        const taxReceiptCheckbox = await waitForElement('input[name="pricemodal_is_eligible_tax_receipt"]', 5000);
        if (!taxReceiptCheckbox.checked) {
          taxReceiptCheckbox.click();
        }

        // 3.d.2: Handle trending donation checkbox based on donPonctuelFavori
        const trendingCheckbox = await waitForElement('input[name="pricemodal_is_trending_donation"]', 5000);
        const shouldBeFavorite = donPonctuelFavori !== null && donPonctuelFavori === amount;

        if (shouldBeFavorite && !trendingCheckbox.checked) {
          console.log(`Marking ${amount} as trending donation (favori)`);
          trendingCheckbox.click();
        } else if (!shouldBeFavorite && trendingCheckbox.checked) {
          console.log(`Unmarking ${amount} as trending donation`);
          trendingCheckbox.click();
        }

        // 3.e: Click confirm button in modal footer
        const confirmBtn = await waitForElement('button[data-testid="button-submit-old-tier"]', 5000);
        confirmBtn.click();

        // Wait for modal to close
        await waitForElementToDisappear('[data-test="ha-modal"]', 5000);
      }
    }

    // Step 4: Click on radio label
    console.log('Step 4: Clicking radio label');
    const radioLabel = await waitForElement('label[data-test="ha-radio-label"]', 5000);
    radioLabel.click();

    // Step 5: Ensure open donation switch is checked
    console.log('Step 5: Checking open donation switch');
    const openDonationSwitch = await waitForElement('input[data-testid="switch-open-donation"]', 5000);
    if (!openDonationSwitch.checked) {
      openDonationSwitch.click();
    }

    // Step 6: Check single donation checkbox
    console.log('Step 6: Checking single donation checkbox');
    const singleCheckbox = await waitForElement('input[data-testid="checkbox-open-donation-single"]', 5000);
    if (!singleCheckbox.checked) {
      singleCheckbox.click();
    }

    // Step 7: Check monthly donation checkbox
    console.log('Step 7: Checking monthly donation checkbox');
    const monthlyCheckbox = await waitForElement('input[data-testid="checkbox-open-donation-monthly"]', 5000);
    if (!monthlyCheckbox.checked) {
      monthlyCheckbox.click();
    }

    // Step 8: Click next step button
    console.log('Step 8: Clicking next step button');
    const nextStepBtn = await waitForElement('button[data-test="button-next-step"]', 5000);
    nextStepBtn.click();

    // Step 9: Wait for pathway-item-2 to have active class, then click pathway-item-4
    try {
      console.log('Step 9: Waiting for pathway-item-3 to be active');
      await waitForElementWithClass('li[data-testid="pathway-item-3"]', 'active', 10000);
    } catch (error) {
      console.warn('Warning: Steps 9-13 encountered an error, but continuing anyway:', error.message);
      // Don't throw - allow the process to continue to next campaign
    }

    console.log('Step 9: Clicking pathway-item-4');
    const pathwayItem4 = await waitForElement('li[data-testid="pathway-item-4"]', 5000);
    pathwayItem4.click();

    // Step 10: Wait for page URL to be on step 4 (edition/4)
    console.log('Step 10: Waiting for edition/4 page');
    await waitForUrlPattern(/\/formulaires\/[^/]+\/edition\/4/, 10000);

    // Step 11: Fill color input with value a65d58
    console.log('Step 11: Filling color input');
    const colorInput = await waitForElement('input[name="color"]', 5000);
    await simulateKeyboardInput(colorInput, 'a65d58');

    await sleep(500); 

    // Step 12: Click next step button
    console.log('Step 12: Clicking next step button');
    const nextStepBtn2 = await waitForElement('button[data-test="button-next-step"]', 5000);
    nextStepBtn2.click();

    // Step 13: Wait for diffusion page
    console.log('Step 13: Waiting for diffusion page');
    await waitForUrlPattern(/\/formulaires\/[^/]+\/diffusion/, 10000);

    console.log('Successfully completed all steps for this campaign');

    return true;
  } catch (error) {
    console.error('Error adding dons ponctuels:', error);
    throw error;
  }
}

// Simulate keyboard input for better compatibility
async function simulateKeyboardInput(element, value) {
  // Focus the element
  element.focus();
  await sleep(100);

  // Clear existing value
  element.value = '';
  element.dispatchEvent(new Event('input', { bubbles: true }));

  // Type each character
  for (let char of value) {
    element.value += char;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(50);
  }

  // Trigger change and blur events
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
  await sleep(100);
}

// Helper function to wait for element to appear
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

// Helper function for sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to wait for element to disappear
function waitForElementToDisappear(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (!element) {
      resolve();
      return;
    }

    const observer = new MutationObserver((_mutations, obs) => {
      const element = document.querySelector(selector);
      if (!element) {
        obs.disconnect();
        resolve();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} still present after ${timeout}ms`));
    }, timeout);
  });
}

// Helper function to wait for element with specific class
function waitForElementWithClass(selector, className, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element && element.classList.contains(className)) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((_mutations, obs) => {
      const element = document.querySelector(selector);
      if (element && element.classList.contains(className)) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} did not get class "${className}" within ${timeout}ms`));
    }, timeout);
  });
}

// Helper function to wait for URL pattern
function waitForUrlPattern(pattern, timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (pattern.test(window.location.pathname)) {
      resolve();
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (pattern.test(window.location.pathname)) {
        clearInterval(checkInterval);
        resolve();
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error(`URL did not match pattern ${pattern} within ${timeout}ms`));
      }
    }, 100);
  });
}

console.log('HelloAsso Form Automator content script loaded');
