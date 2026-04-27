export const locales = ["en", "zh-HK"] as const;

export type Locale = (typeof locales)[number];
export type Mode = "mark6" | "horse";
export type ConfidenceBand = "Low" | "Medium" | "High";

type CopyShape = {
  appTitle: string;
  navHome: string;
  navHistory: string;
  navAnalytics: string;
  mark6: string;
  horse: string;
  selectDate: string;
  generate: string;
  generating: string;
  goToHkjc: string;
  suggestionsTitle: string;
  explanationTitle: string;
  confidenceTitle: string;
  progressSteps: [string, string, string, string];
  noSuggestionYet: string;
  disclaimer: string;
  footerDisclaimer: string;
  historyTitle: string;
  analyticsTitle: string;
  historyDate: string;
  historyResult: string;
  historyNote: string;
  analyticsConfidence: string;
  analyticsTrend: string;
  staleDataFallback: string;
};

export const copy: Record<Locale, CopyShape> = {
  en: {
    appTitle: "Mobile Betting Assistant",
    navHome: "Home",
    navHistory: "History",
    navAnalytics: "Analytics",
    mark6: "Mark Six",
    horse: "Horse Racing",
    selectDate: "Select Date",
    generate: "Generate Suggestions",
    generating: "Generating...",
    goToHkjc: "Go to HKJC",
    suggestionsTitle: "AI Suggestions",
    explanationTitle: "Explanation",
    confidenceTitle: "Confidence",
    progressSteps: [
      "Fetching data...",
      "Analyzing...",
      "Generating suggestions...",
      "Done.",
    ],
    noSuggestionYet: "Choose game, date, and generate suggestions.",
    disclaimer:
      "For entertainment only. No guaranteed winnings. No financial advice.",
    footerDisclaimer:
      "Entertainment only. No guaranteed winnings. This app does not process bets.",
    historyTitle: "Past Winners",
    analyticsTitle: "Trend Analytics",
    historyDate: "Date",
    historyResult: "Results",
    historyNote: "AI Notes",
    analyticsConfidence: "Confidence Distribution",
    analyticsTrend: "Suggestion Outcome Trend",
    staleDataFallback:
      "Data is currently unavailable or stale. Please try again later.",
  },
  "zh-HK": {
    appTitle: "流動投注助手",
    navHome: "主頁",
    navHistory: "歷史",
    navAnalytics: "分析",
    mark6: "六合彩",
    horse: "賽馬",
    selectDate: "選擇日期",
    generate: "生成推薦",
    generating: "正在生成...",
    goToHkjc: "前往香港賽馬會",
    suggestionsTitle: "AI 推薦",
    explanationTitle: "解說",
    confidenceTitle: "信心等級",
    progressSteps: ["正在獲取資料...", "正在分析...", "正在生成推薦...", "完成。"],
    noSuggestionYet: "請先選擇遊戲與日期，然後生成推薦。",
    disclaimer: "僅供娛樂用途，不保證中獎，並非財務建議。",
    footerDisclaimer: "僅供娛樂用途，不保證中獎。本應用不處理任何投注。",
    historyTitle: "過往結果",
    analyticsTitle: "趨勢分析",
    historyDate: "日期",
    historyResult: "結果",
    historyNote: "AI 備註",
    analyticsConfidence: "信心分佈",
    analyticsTrend: "推薦結果趨勢",
    staleDataFallback: "資料暫時未能提供或已過期，請稍後再試。",
  },
};
