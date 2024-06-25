# 翻譯蒟蒻 (Translation Gummy)

> [!NOTE]
> 本專案透過 GenAI 的方式建立完成，透過 Claude AI 完成所有功能開發，相關 prompts 如下：
>
> This project was completed using GenAI, with all features developed through Claude AI. The related prompts are as follows:
> * [claude-01.png](claude_prompts/claude-01.png)
> * [claude-02.png](claude_prompts/claude-02.png)


翻譯蒟蒻 (Translation Gummy)是一個 Chrome Extension，可以透過選擇文字去透過 Open AI API 翻譯文字內容，以及摘要文字內容，並將文字內容播放給你。

Translation Gummy is a Chrome Extension that allows you to translate text content using the OpenAI API by selecting text, summarize text content, and play the text content for you.

## 功能 Features

- **文字翻譯**：選擇網頁上的文字並翻譯成指定的語言。
- **文字總結**：選擇較長的文字段落並生成摘要。
- **文字轉語音**：生成所選文字的聲音並播放。

<br>

- **Text Translation**: Select text on a webpage and translate it into the specified language.
- **Text Summary**: Select longer text passages and generate summaries.
- **Text-to-Speech**: Generate and play the audio of the selected text.

## 安裝 Installation

1. 下載或複製此專案到你的本地機。
2. 打開 Chrome 瀏覽器並在網址列填入 `chrome://extensions/`。
3. 開啟「開發者模式」。
4. 點擊「載入未封裝項目」，選擇專案所在的資料夾。

<br>

1. Download or clone this project to your local machine.
2. Open the Chrome browser and navigate to `chrome://extensions/`.
3. Enable "Developer mode".
4. Click "Load unpacked", and select the project folder.

## 使用方法 Usage

1. 在安裝擴充程式後，點擊瀏覽器右上角的擴充圖示，進入設定頁面（options.html）。
2. 設置 OpenAI API 密鑰、AI 模型及目標語言，並確保擴充功能已啟用。
3. 在任何網頁上選擇文字(反白文字)，將在選擇的文字旁邊顯示[翻譯文字]和[總結文字]按鈕。
4. 點擊相應按鈕即可進行翻譯或總結操作，並可以播放結果內的文字。

<br>

1. After installing the extension, click the extension icon in the upper right corner of the browser to enter the settings page (options.html).
2. Set the OpenAI API key, AI model, and target language, and ensure that the extension is enabled.
3. Select text on any webpage (highlight the text), and the [Translate Text] and [Summarize Text] buttons will appear next to the selected text.
4. Click the corresponding button to perform translation or summarization operations, and you can play the text in the result.

## 貢獻 Contribution

歡迎對本專案進行貢獻，請提交 pull request 或報告問題。

Contributions to this project are welcome. Please submit a pull request or report issues.
