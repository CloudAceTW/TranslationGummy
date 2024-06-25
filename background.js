chrome.action?.onClicked?.addListener((tab) => {
  chrome.runtime.openOptionsPage();
});

chrome.storage?.onChanged?.addListener((changes, namespace) => {
  if (namespace === 'sync' && 'enableExtension' in changes) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "updateExtensionStatus",
          enabled: changes.enableExtension.newValue
        });
      }
    });
  }
});
