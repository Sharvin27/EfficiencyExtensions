import { handleTabUpdate } from './tab_distraction/tab_background.js';
import { handleNotepadMessage } from './notepad/notion_background.js';

chrome.tabs.onUpdated.addListener(handleTabUpdate);
chrome.runtime.onMessage.addListener(handleNotepadMessage);
