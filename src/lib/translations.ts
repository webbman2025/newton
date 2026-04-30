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
  historyRace: string;
  historyResult: string;
  historyNote: string;
  analyticsConfidence: string;
  analyticsTrend: string;
  staleDataFallback: string;
  upcomingRacesTitle: string;
  upcomingRacesLoading: string;
  upcomingRacesEmpty: string;
  upcomingRacePostTime: string;
  upcomingRaceDistance: string;
  upcomingRaceClass: string;
  upcomingRaceFocusHint: string;
  horseCalendarDatesLabel: string;
  horseCalendarTimesLabel: string;
  horseCalendarNoRacesForDate: string;
  horseResultsOnDateLabel: string;
  horseResultsOnDateEmpty: string;
  horsePastDateResultsMode: string;
  horseOfficialWinnerLabel: string;
  horseOfficialTopFinishersLabel: string;
  selectedRaceLabel: string;
  mark6PredictionTypeLabel: string;
  mark6PredictionSingle: string;
  mark6PredictionMultiple: string;
  mark6PredictionBanker: string;
  mark6GenerateModeLabel: string;
  mark6GenerateModeAuto: string;
  mark6GenerateModeManual: string;
  mark6ManualPickLabel: string;
  mark6ManualPickedCountLabel: string;
  mark6ManualClearAction: string;
  mark6AddAction: string;
  mark6ManualSetProgressLabel: string;
  mark6ManualNeedExactlyLabel: string;
  mark6ManualAllSetsAddedLabel: string;
  mark6ManualStartNewAction: string;
  mark6ManualNeedAtLeastLabel: string;
  mark6GenerateCountLabel: string;
  mark6GenerateCountOptionSets: string;
  mark6NumberMixLabel: string;
  mark6NumberMixMixed: string;
  mark6NumberMixSmallOnly: string;
  mark6NumberMixBigOnly: string;
  mark6GeneratedSetsLabel: string;
  mark6MixGeneratedSetsAction: string;
  mark6MixedSetsLabel: string;
  mark6MixNotEnoughNumbers: string;
  mark6SetLabel: string;
  mark6BankerLabel: string;
  mark6SelectionsLabel: string;
  mark6EstimatedCombinationsLabel: string;
  mark6UpcomingDrawDatesLabel: string;
  mark6UpcomingDrawDatesLoading: string;
  mark6UpcomingDrawDatesFallback: string;
  horseWinningHorseLabel: string;
  horsePreviousWinnerLabel: string;
  horsePreviousWinnerDateLabel: string;
  horsePreviousWinnerLoading: string;
  horsePreviousWinnerUnavailable: string;
  horsePredictedPositionsLabel: string;
  horsePredictionHint: string;
  horsePredictionViewChips: string;
  horsePredictionViewTable: string;
  horsePredictionColumnNumber: string;
  horsePredictionColumnHorse: string;
  horsePredictionColumnPosition: string;
  horsePredictionColumnSpeed: string;
  horsePredictionColumnOdds: string;
  horsePredictionColumnEdge: string;
  horsePredictedWinnerLabel: string;
  horsePredictedWinnerUnavailable: string;
  horseTop3PredictionsLabel: string;
  horseGeneratedAtLabel: string;
  horsePredictionMarginLabel: string;
  horseBetTypesLabel: string;
  horseRecommendedBetLabel: string;
  horseRecommendedBetHintNoPrediction: string;
  horseBetTypeWin: string;
  horseBetTypePlace: string;
  horseBetTypeQuinella: string;
  horseBetTypeQuinellaPlace: string;
  horseBetTypeExacta: string;
  horseBetTypeTrio: string;
  horseBetTypeTierce: string;
  horseBetTypeInfoTitle: string;
  horseBetTypeInfoWin: string;
  horseBetTypeInfoPlace: string;
  horseBetTypeInfoQuinella: string;
  horseBetTypeInfoQuinellaPlace: string;
  horseBetTypeInfoExacta: string;
  horseBetTypeInfoTrio: string;
  horseBetTypeInfoTierce: string;
  horseStakeLabel: string;
  horseEstimatedPayoutTitle: string;
  horseEstimatedReturnLabel: string;
  horseEstimatedProfitLabel: string;
  horseEstimatedPayoutDisclaimer: string;
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
    suggestionsTitle: "Predictions",
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
    historyRace: "Race",
    historyResult: "Results",
    historyNote: "AI Notes",
    analyticsConfidence: "Confidence Distribution",
    analyticsTrend: "Suggestion Outcome Trend",
    staleDataFallback:
      "Data is currently unavailable or stale. Please try again later.",
    upcomingRacesTitle: "Upcoming Sha Tin / Happy Valley Races",
    upcomingRacesLoading: "Loading upcoming race cards...",
    upcomingRacesEmpty: "No upcoming Sha Tin or Happy Valley races are available yet.",
    upcomingRacePostTime: "Post Time",
    upcomingRaceDistance: "Distance",
    upcomingRaceClass: "Class",
    upcomingRaceFocusHint:
      "Tap a race card below to focus AI suggestions on that race's declared runners.",
    horseCalendarDatesLabel: "Upcoming race dates",
    horseCalendarTimesLabel: "Next schedule",
    horseCalendarNoRacesForDate: "No race schedule for the selected date.",
    horseResultsOnDateLabel: "Race winners on selected date",
    horseResultsOnDateEmpty: "No completed race results for the selected date yet.",
    horsePastDateResultsMode: "Past date selected: showing official race results only.",
    horseOfficialWinnerLabel: "Official Winner",
    horseOfficialTopFinishersLabel: "Top Finishers",
    selectedRaceLabel: "Selected Race",
    mark6PredictionTypeLabel: "Prediction Type",
    mark6PredictionSingle: "Single",
    mark6PredictionMultiple: "Multiple",
    mark6PredictionBanker: "Banker",
    mark6GenerateModeLabel: "Generation Mode",
    mark6GenerateModeAuto: "Auto",
    mark6GenerateModeManual: "Manual",
    mark6ManualPickLabel: "Tap Numbers (1-49)",
    mark6ManualPickedCountLabel: "Picked",
    mark6ManualClearAction: "Clear Picks",
    mark6AddAction: "Add",
    mark6ManualSetProgressLabel: "Manual sets progress",
    mark6ManualNeedExactlyLabel: "Pick exactly 6 numbers to add a set.",
    mark6ManualAllSetsAddedLabel: "All manual sets already added for selected set count.",
    mark6ManualStartNewAction: "Start New Manual Sets",
    mark6ManualNeedAtLeastLabel: "Pick at least 6 numbers to generate in manual mode.",
    mark6GenerateCountLabel: "Generate How Many Sets",
    mark6GenerateCountOptionSets: "sets",
    mark6NumberMixLabel: "Number Mix Style",
    mark6NumberMixMixed: "Mixed small + big",
    mark6NumberMixSmallOnly: "Small numbers only",
    mark6NumberMixBigOnly: "Big numbers only",
    mark6GeneratedSetsLabel: "Generated sets",
    mark6MixGeneratedSetsAction: "Mix Within Generated Sets",
    mark6MixedSetsLabel: "Mixed sets",
    mark6MixNotEnoughNumbers:
      "Need at least 2 generated sets and enough unique numbers to mix.",
    mark6SetLabel: "Set",
    mark6BankerLabel: "Banker",
    mark6SelectionsLabel: "Selections",
    mark6EstimatedCombinationsLabel: "Estimated combinations",
    mark6UpcomingDrawDatesLabel: "Upcoming draw dates",
    mark6UpcomingDrawDatesLoading: "Loading draw dates...",
    mark6UpcomingDrawDatesFallback:
      "Using estimated draw pattern (Tue/Thu/Sat) while live schedule is unavailable.",
    horseWinningHorseLabel: "Winning Horse",
    horsePreviousWinnerLabel: "Previous Winner",
    horsePreviousWinnerDateLabel: "Last result date",
    horsePreviousWinnerLoading: "Loading previous winner...",
    horsePreviousWinnerUnavailable: "No previous winner data yet.",
    horsePredictedPositionsLabel: "Predicted positions (pre-race)",
    horsePredictionHint: "Press Generate to produce Race 1-8 predictions.",
    horsePredictionViewChips: "Chips",
    horsePredictionViewTable: "Table",
    horsePredictionColumnNumber: "#",
    horsePredictionColumnHorse: "Horse",
    horsePredictionColumnPosition: "Predicted Position",
    horsePredictionColumnSpeed: "Speed Index",
    horsePredictionColumnOdds: "Odds",
    horsePredictionColumnEdge: "Edge Score",
    horsePredictedWinnerLabel: "Predicted Winner",
    horsePredictedWinnerUnavailable: "Generate to see winner prediction.",
    horseTop3PredictionsLabel: "Top 3 Predicted Horses",
    horseGeneratedAtLabel: "Generated at",
    horsePredictionMarginLabel: "Prediction Margin",
    horseBetTypesLabel: "Bet Types",
    horseRecommendedBetLabel: "Recommended Bets",
    horseRecommendedBetHintNoPrediction: "Generate predictions first to receive bet-type guidance.",
    horseBetTypeWin: "Win",
    horseBetTypePlace: "Place",
    horseBetTypeQuinella: "Quinella",
    horseBetTypeQuinellaPlace: "Quinella Place",
    horseBetTypeExacta: "Exacta",
    horseBetTypeTrio: "Trio",
    horseBetTypeTierce: "Tierce",
    horseBetTypeInfoTitle: "Horse Bet Type Guide",
    horseBetTypeInfoWin: "Win — horse finishes 1st.",
    horseBetTypeInfoPlace:
      "Place — your selected horse finishes in a paying position (usually top 2 or top 3, depending on race rules).",
    horseBetTypeInfoQuinella: "Quinella — pick top 2 in any order.",
    horseBetTypeInfoQuinellaPlace:
      "Quinella Place — pick 2 horses that both finish in top 3.",
    horseBetTypeInfoExacta:
      "Exacta (or Forecast) — pick top 2 in exact order.",
    horseBetTypeInfoTrio: "Trio — pick top 3 in any order.",
    horseBetTypeInfoTierce:
      "Tierce / Trifecta — pick top 3 in exact order.",
    horseStakeLabel: "Stake (HKD)",
    horseEstimatedPayoutTitle: "Estimated Payout (Pool-based)",
    horseEstimatedReturnLabel: "Return",
    horseEstimatedProfitLabel: "Profit",
    horseEstimatedPayoutDisclaimer:
      "Estimate only. Final dividend depends on pool size, market bets, and official result settlement.",
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
    suggestionsTitle: "預測結果",
    explanationTitle: "解說",
    confidenceTitle: "信心等級",
    progressSteps: ["正在獲取資料...", "正在分析...", "正在生成推薦...", "完成。"],
    noSuggestionYet: "請先選擇遊戲與日期，然後生成推薦。",
    disclaimer: "僅供娛樂用途，不保證中獎，並非財務建議。",
    footerDisclaimer: "僅供娛樂用途，不保證中獎。本應用不處理任何投注。",
    historyTitle: "過往結果",
    analyticsTitle: "趨勢分析",
    historyDate: "日期",
    historyRace: "場次",
    historyResult: "結果",
    historyNote: "AI 備註",
    analyticsConfidence: "信心分佈",
    analyticsTrend: "推薦結果趨勢",
    staleDataFallback: "資料暫時未能提供或已過期，請稍後再試。",
    upcomingRacesTitle: "沙田 / 跑馬地 即將開跑賽事",
    upcomingRacesLoading: "正在載入即將開跑賽事...",
    upcomingRacesEmpty: "暫未有沙田或跑馬地的即將開跑賽事。",
    upcomingRacePostTime: "開跑時間",
    upcomingRaceDistance: "路程",
    upcomingRaceClass: "班次",
    upcomingRaceFocusHint: "點按下方賽事卡，AI 會聚焦該場已報名馬匹進行推薦。",
    horseCalendarDatesLabel: "即將開跑日期",
    horseCalendarTimesLabel: "下一場時間表",
    horseCalendarNoRacesForDate: "所選日期暫未有賽程。",
    horseResultsOnDateLabel: "所選日期賽果冠軍",
    horseResultsOnDateEmpty: "所選日期暫未有已完成賽果。",
    horsePastDateResultsMode: "已選過往日期：只顯示該日官方賽果。",
    horseOfficialWinnerLabel: "官方冠軍",
    horseOfficialTopFinishersLabel: "前列名次",
    selectedRaceLabel: "已選賽事",
    mark6PredictionTypeLabel: "預測模式",
    mark6PredictionSingle: "單式",
    mark6PredictionMultiple: "複式",
    mark6PredictionBanker: "膽拖",
    mark6GenerateModeLabel: "生成模式",
    mark6GenerateModeAuto: "自動",
    mark6GenerateModeManual: "手動",
    mark6ManualPickLabel: "點選號碼（1-49）",
    mark6ManualPickedCountLabel: "已選",
    mark6ManualClearAction: "清除已選",
    mark6AddAction: "加入",
    mark6ManualSetProgressLabel: "手動組合進度",
    mark6ManualNeedExactlyLabel: "每組必須剛好選6個號碼才可加入。",
    mark6ManualAllSetsAddedLabel: "已按所選組數完成全部手動組合。",
    mark6ManualStartNewAction: "開始新一輪手動組合",
    mark6ManualNeedAtLeastLabel: "手動模式需至少選擇6個號碼。",
    mark6GenerateCountLabel: "一次生成組數",
    mark6GenerateCountOptionSets: "組",
    mark6NumberMixLabel: "號碼分佈",
    mark6NumberMixMixed: "大小混合",
    mark6NumberMixSmallOnly: "只要細號",
    mark6NumberMixBigOnly: "只要大號",
    mark6GeneratedSetsLabel: "已生成組合",
    mark6MixGeneratedSetsAction: "混合同批組合",
    mark6MixedSetsLabel: "混合後組合",
    mark6MixNotEnoughNumbers: "需要至少2組已生成組合及足夠不重複號碼才可混合。",
    mark6SetLabel: "組合",
    mark6BankerLabel: "膽",
    mark6SelectionsLabel: "拖碼",
    mark6EstimatedCombinationsLabel: "預計組合數",
    mark6UpcomingDrawDatesLabel: "即將開彩日期",
    mark6UpcomingDrawDatesLoading: "正在載入開彩日期...",
    mark6UpcomingDrawDatesFallback: "暫時未能取得官方日程，先以週二/四/六估算顯示。",
    horseWinningHorseLabel: "勝出馬匹",
    horsePreviousWinnerLabel: "上場冠軍",
    horsePreviousWinnerDateLabel: "最近結果日期",
    horsePreviousWinnerLoading: "正在載入上場冠軍...",
    horsePreviousWinnerUnavailable: "暫未有上場冠軍資料。",
    horsePredictedPositionsLabel: "預測名次（賽前）",
    horsePredictionHint: "按「生成推薦」即可產生第1至8場預測。",
    horsePredictionViewChips: "標籤",
    horsePredictionViewTable: "表格",
    horsePredictionColumnNumber: "號碼",
    horsePredictionColumnHorse: "馬匹",
    horsePredictionColumnPosition: "預測名次",
    horsePredictionColumnSpeed: "速度指數",
    horsePredictionColumnOdds: "賠率",
    horsePredictionColumnEdge: "優勢分數",
    horsePredictedWinnerLabel: "預測冠軍",
    horsePredictedWinnerUnavailable: "請先生成以查看預測冠軍。",
    horseTop3PredictionsLabel: "預測前三名",
    horseGeneratedAtLabel: "生成時間",
    horsePredictionMarginLabel: "預測差距",
    horseBetTypesLabel: "投注類型",
    horseRecommendedBetLabel: "建議投注",
    horseRecommendedBetHintNoPrediction: "請先生成預測，系統才會提供投注類型建議。",
    horseBetTypeWin: "獨贏",
    horseBetTypePlace: "位置",
    horseBetTypeQuinella: "連贏",
    horseBetTypeQuinellaPlace: "位置Q",
    horseBetTypeExacta: "位置Q (順序)",
    horseBetTypeTrio: "三重彩（任意）",
    horseBetTypeTierce: "單T",
    horseBetTypeInfoTitle: "賽馬投注類型說明",
    horseBetTypeInfoWin: "獨贏 — 馬匹跑第1名。",
    horseBetTypeInfoPlace: "位置 — 你選擇的馬匹只需跑入派彩位置（通常為前2或前3名，視乎場次及規則）。",
    horseBetTypeInfoQuinella: "連贏 — 選中前2名，次序不限。",
    horseBetTypeInfoQuinellaPlace: "位置Q — 選2匹馬且兩匹都跑入前3名。",
    horseBetTypeInfoExacta: "位置Q (順序) / Forecast — 選中前2名且次序正確。",
    horseBetTypeInfoTrio: "三重彩（任意）— 選中前3名，次序不限。",
    horseBetTypeInfoTierce: "單T / Trifecta — 選中前3名且次序正確。",
    horseStakeLabel: "投注金額（港元）",
    horseEstimatedPayoutTitle: "預計派彩（彩池制）",
    horseEstimatedReturnLabel: "回報",
    horseEstimatedProfitLabel: "盈利",
    horseEstimatedPayoutDisclaimer:
      "僅為估算。最終派彩取決於彩池金額、市場投注分佈及官方賽果結算。",
  },
};
