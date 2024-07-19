let selectionButton, summaryButton, translationResult
let isProcessing = false
let currentAudio = null
let isResultVisible = false

const createElementWithProperties = (tag, properties) => {
  const element = document.createElement(tag)
  Object.assign(element, properties)
  return element
}

const createButton = (text, className, isVisible = true) => {
  return createElementWithProperties('button', {
    textContent: text,
    className,
    style: isVisible ? '' : 'display: none;'
  })
}

const createButtons = () => {
  selectionButton = createButton('翻譯文字', 'text-selector-btn', false)
  summaryButton = createButton('總結文字', 'text-summary-btn', false)

  selectionButton.addEventListener('click', () => handleTextProcessing(translateText, '翻譯中...', '翻譯文字'))
  summaryButton.addEventListener('click', () => handleTextProcessing(summarizeText, '總結中...', '總結文字'))

  document.body.append(selectionButton, summaryButton)
}

const createTranslationResult = () => {
  translationResult = createElementWithProperties('div', {
    className: 'translation-result',
    style: 'display: none;'
  })
  ;['mousedown', 'mouseup'].forEach((event) => translationResult.addEventListener(event, (e) => e.stopPropagation()))

  document.body.appendChild(translationResult)
}

const handleTextProcessing = async (processFunction, processingText, originalText) => {
  if (isProcessing) return
  const selectedText = window.getSelection().toString().trim()
  if (!selectedText) return

  isProcessing = true
  const activeButton = processFunction === translateText ? selectionButton : summaryButton
  activeButton.textContent = processingText
  activeButton.classList.add('loading')

  try {
    const resultText = await processFunction(selectedText)
    await showTranslationResult(resultText)
  } catch (error) {
    console.error('處理錯誤：', error)
    alert('處理失敗，請檢查API密鑰是否正確設置。')
  } finally {
    isProcessing = false
    activeButton.textContent = originalText
    activeButton.classList.remove('loading')
  }
}

const handleSelection = () => {
  const selectedText = window.getSelection().toString().trim()
  if (selectedText.length > 0) {
    document.addEventListener('mouseup', handleMouseUp, { once: true })
  } else if (!isResultVisible) {
    hideTranslationResult()
  }
}

const handleMouseUp = (e) => {
  chrome.storage.sync.get(['enableExtension', 'targetLanguage'], async (data) => {
    if (!data.enableExtension) return

    const selection = window.getSelection()
    const selectedText = selection.toString().trim()

    if (selectedText.length > 0 && !translationResult.contains(e.target)) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      if (!translationResult.contains(range.startContainer) && !translationResult.contains(range.endContainer)) {
        const { top, left } = getButtonPosition(rect)
        const targetLanguage = data.targetLanguage || 'en'
        const isTargetLanguage = !isTextInSpecifiedLanguage(selectedText, targetLanguage)

        updateButtonVisibility(isTargetLanguage, selectedText.length >= 50, top, left, targetLanguage)
      }
    } else if (!translationResult.contains(e.target) && !isResultVisible) {
      hideTranslationResult(true)
    }
  })
}

const getButtonPosition = (rect) => ({
  top: `${window.scrollY + rect.bottom}px`,
  left: `${window.scrollX + rect.left}px`
})

const updateButtonVisibility = (isTargetLanguage, isSummaryEligible, top, left, targetLanguage) => {
  selectionButton.style.display = isTargetLanguage ? 'block' : 'none'
  summaryButton.style.display = isSummaryEligible ? 'block' : 'none'

  if (isTargetLanguage) {
    selectionButton.textContent = `翻譯${getLanguageName(targetLanguage)}`
    selectionButton.style.top = top
    selectionButton.style.left = left
  }

  if (isSummaryEligible) {
    summaryButton.style.top = top
    summaryButton.style.left = isTargetLanguage ? `${parseInt(left) + selectionButton.offsetWidth + 5}px` : left
  }

  if (!isResultVisible) {
    translationResult.style.display = 'none'
  }
}

const hideTranslationResult = (force = false) => {
  if (force || (!translationResult.contains(document.activeElement) && !isResultVisible)) {
    ;[selectionButton, summaryButton, translationResult].forEach((el) => (el.style.display = 'none'))
    isResultVisible = false

    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      currentAudio = null
    }
  }
}

const showTranslationResult = async (text) => {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }

  translationResult.textContent = ''
  translationResult.style.display = 'block'
  isResultVisible = true

  const rect = selectionButton.getBoundingClientRect()
  Object.assign(translationResult.style, {
    top: `${window.scrollY + rect.bottom + 5}px`,
    left: `${window.scrollX + rect.left}px`
  })

  const textElement = createElementWithProperties('p', { textContent: text })
  translationResult.appendChild(textElement)

  // try {
  //   const audioUrl = await generateSpeech(text)
  //   const playButton = createPlayButton(audioUrl)
  //   translationResult.appendChild(playButton)
  // } catch (error) {
  //   console.error('音頻生成錯誤：', error)
  // }
}

const createPlayButton = (audioUrl) => {
  console.log('Creating play button with URL:', audioUrl)
  const playButton = createButton('播放', 'play-audio-btn', true) // 確保播放按鈕可見

  playButton.style.marginTop = '10px'

  playButton.addEventListener('click', (e) => {
    console.log('Play button clicked')
    e.stopPropagation()
    if (currentAudio && !currentAudio.paused) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      playButton.textContent = '播放'
    } else {
      if (currentAudio) {
        currentAudio.pause()
      }
      currentAudio = new Audio(audioUrl)
      currentAudio.play().catch((error) => {
        console.error('音頻播放失敗：', error)
      })
      playButton.textContent = '暫停'

      currentAudio.onended = () => {
        playButton.textContent = '播放'
        currentAudio = null
      }
    }
  })

  return playButton
}

const translateText = (text) => performApiRequest(text, 'translator')
const summarizeText = (text) => performApiRequest(text, 'summarizer')

const performApiRequest = (text, role) => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['apiKey', 'targetLanguage', 'aiModel'], async (data) => {
      if (!data.apiKey) {
        reject(new Error('API密鑰未設置'))
        return
      }

      const targetLanguage = data.targetLanguage || 'zh-TW'
      const aiModel = data.aiModel || 'gpt-4o-mini'
      const languageNames = {
        'zh-TW': 'Traditional Chinese',
        en: 'English',
        ja: 'Japanese',
        ko: 'Korean'
      }

      const systemContent =
        role === 'translator'
          ? `You are a translator. Translate the following text to ${languageNames[targetLanguage]}.`
          : `You are a summarizer. Summarize the following text in ${languageNames[targetLanguage]} using between 50 to 200 characters.`

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.apiKey}`
          },
          body: JSON.stringify({
            model: aiModel,
            messages: [
              { role: 'system', content: systemContent },
              { role: 'user', content: text }
            ]
          })
        })

        if (!response.ok) {
          throw new Error('API請求失敗')
        }

        const result = await response.json()
        resolve(result.choices[0].message.content.trim())
      } catch (error) {
        reject(error)
      }
    })
  })
}

const generateSpeech = (text) => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['apiKey'], async (data) => {
      if (!data.apiKey) {
        reject(new Error('API密鑰未設置'))
        return
      }

      try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.apiKey}`
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice: 'nova',
            response_format: 'mp3',
            speed: 1.0
          })
        })

        if (!response.ok) {
          throw new Error('音頻生成失敗')
        }

        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        resolve(audioUrl)
      } catch (error) {
        reject(error)
      }
    })
  })
}

const isTextInSpecifiedLanguage = (text, specifiedLanguage) => {
  const languageRegexMap = {
    'zh-TW': /[\u4e00-\u9fff]/g,
    ja: /[\u3040-\u30ff\u31f0-\u31ff\uFF00-\uFFEF]/g,
    en: /[a-zA-Z]/g,
    ko: /[\uac00-\ud7af]/g
  }

  if (!languageRegexMap[specifiedLanguage]) {
    throw new Error('Unsupported language specified')
  }

  const regex = languageRegexMap[specifiedLanguage]
  const matchedCharacters = text.match(regex) || []
  return matchedCharacters.length / text.length > 0.5
}

const getLanguageName = (languageCode) => {
  const languageNames = {
    'zh-TW': '繁體中文',
    en: '英文',
    ja: '日文',
    ko: '韓文'
  }
  return languageNames[languageCode] || '中文'
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateExtensionStatus' && !request.enabled) {
    hideTranslationResult()
  }
})

document.addEventListener('selectionchange', handleSelection)
document.addEventListener('click', (e) => {
  if (!translationResult.contains(e.target) && e.target !== selectionButton && e.target !== summaryButton) {
    hideTranslationResult(true)
  }
})

window.addEventListener('load', () => {
  createButtons()
  createTranslationResult()
})

window.addEventListener('beforeunload', () => {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
})
