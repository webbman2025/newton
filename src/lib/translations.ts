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
  confidenceBandLow: string;
  confidenceBandMedium: string;
  confidenceBandHigh: string;
  mark6ManualChipAriaLabel: string;
  errorGenerateSuggestionsFailed: string;
  errorMark6OverviewFailed: string;
  progressSteps: [string, string, string, string];
  noSuggestionYet: string;
  disclaimer: string;
  footerDisclaimer: string;
  footerCompliance: string;
  footerHkjcLink: string;
  donationButton: string;
  donationHint: string;
  donationQrTitle: string;
  donationQrDesktopHint: string;
  donationQrMobileHint: string;
  donationQrOpenImage: string;
  donationQrBack: string;
  donationQrClose: string;
  historyTitle: string;
  analyticsTitle: string;
  historyDate: string;
  historyRace: string;
  historyResult: string;
  historyNote: string;
  historyNoRowsMessage: string;
  historyHorseRangeLabel: string;
  historyHorseRangeWeek: string;
  historyHorseRangeAll: string;
  historyHorseVenueSt: string;
  historyHorseVenueHv: string;
  historyHorseMeetingsHeading: string;
  historyHorseAccordionSummary: string;
  historyHorseMoreLines: string;
  analyticsConfidence: string;
  analyticsTrend: string;
  analyticsHorseBacktestTitle: string;
  analyticsHorseBacktestTop1: string;
  analyticsHorseBacktestSamples: string;
  analyticsHorseCalibrationTitle: string;
  analyticsHorseCalibrationBand: string;
  analyticsHorseCalibrationHitRate: string;
  analyticsHorseCalibrationSample: string;
  analyticsQuickReadTitle: string;
  analyticsQuickReadSubtitle: string;
  analyticsMetricRecentAccuracy: string;
  analyticsMetricRecentAccuracyHint: string;
  analyticsMetricConfidenceNow: string;
  analyticsMetricConfidenceNowHint: string;
  analyticsMetricDataStatus: string;
  analyticsMetricDataStatusHint: string;
  analyticsDataStatusLive: string;
  analyticsDataStatusLimited: string;
  analyticsAdvancedDetails: string;
  analyticsAdvancedDetailsHint: string;
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
  horseCompletedRacesLabel: string;
  horseUpcomingRacesLabel: string;
  horseRaceStatusResult: string;
  horseRaceStatusUpcoming: string;
  horseRaceStatusAwaiting: string;
  horseRaceDayListLabel: string;
  horseRaceDayRefreshHint: string;
  horsePredictionHitLabel: string;
  horsePredictionMissLabel: string;
  horsePastDateResultsMode: string;
  horseOfficialWinnerLabel: string;
  horseOfficialTopFinishersLabel: string;
  horseResultComparisonTitle: string;
  horseResultComparisonPosition: string;
  horseResultComparisonPredicted: string;
  horseResultComparisonActual: string;
  horseResultComparisonNoData: string;
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
  mark6NumberProbabilityLabel: string;
  mark6OverviewAction: string;
  mark6OverviewTitle: string;
  mark6OverviewSubtitle: string;
  mark6OverviewLoading: string;
  mark6OverviewRankLabel: string;
  mark6OverviewProbabilityLabel: string;
  mark6OverviewFiveYearCountLabel: string;
  mark6MixGeneratedSetsAction: string;
  mark6MixedSetsLabel: string;
  mark6MixNotEnoughNumbers: string;
  mark6CopyAction: string;
  mark6CopySuccess: string;
  mark6CopyFailed: string;
  mark6SetLabel: string;
  mark6BankerLabel: string;
  mark6SelectionsLabel: string;
  mark6EstimatedCombinationsLabel: string;
  mark6UpcomingDrawDatesLabel: string;
  mark6UpcomingDrawDatesLoading: string;
  mark6UpcomingDrawDatesFallback: string;
  mark6PreviousDrawTitle: string;
  mark6PreviousDrawDateLabel: string;
  mark6PreviousDrawSpecialLabel: string;
  mark6PreviousDrawLiveSource: string;
  mark6PreviousDrawLoading: string;
  mark6PreviousDrawUnavailable: string;
  mark6ImpactBestLabel: string;
  mark6MatchedNumbersLabel: string;
  mark6ImpactNearWinning: string;
  mark6ImpactSomeImpact: string;
  mark6ImpactOffMark: string;
  mark6NextDrawLeanTitle: string;
  mark6NextDrawLeanSubtitle: string;
  mark6NextDrawLeanScoreLabel: string;
  mark6NextDrawLeanDisclaimer: string;
  mark6NextDrawLeanMoreSetsAction: string;
  mark6NextDrawLeanResetSetsAction: string;
  mark6NextDrawLeanRankBandLabel: string;
  mark6PersonaSectionTitle: string;
  mark6PersonaSectionSubtitle: string;
  mark6PersonaLotteryAnalyst: string;
  mark6PersonaLotteryAnalystDescription: string;
  mark6PersonaGameTheorist: string;
  mark6PersonaGameTheoristDescription: string;
  mark6PersonaPatternFinder: string;
  mark6PersonaPatternFinderDescription: string;
  mark6QueryHotCold: string;
  mark6QueryOddEven: string;
  mark6QueryRepeatingPatterns: string;
  mark6QueryRecentTrends: string;
  mark6AnalysisTitle: string;
  mark6AnalysisLoading: string;
  mark6AnalysisError: string;
  mark6AnalysisDrawWindow: string;
  mark6AnalysisDraws: string;
  mark6AnalysisHeatmap: string;
  mark6AnalysisFrequency: string;
  mark6AnalysisOddEven: string;
  mark6AnalysisHighLow: string;
  mark6AnalysisOdd: string;
  mark6AnalysisEven: string;
  mark6AnalysisLow: string;
  mark6AnalysisHigh: string;
  mark6AnalysisInsights: string;
  mark6AnalysisSuggested: string;
  mark6AnalysisSourceLive: string;
  mark6AnalysisSourceFallback: string;
  mark6AnalysisProxyNote: string;
  mark6AnalysisFeedTitle: string;
  mark6AnalysisFeedSubtitle: string;
  mark6InsightHot: string;
  mark6InsightCold: string;
  mark6InsightOddEven: string;
  mark6InsightHighLow: string;
  mark6InsightPair: string;
  mark6InsightTriple: string;
  mark6InsightMomentum: string;
  mark6InsightProxy: string;
  mark6ActivePersonaLabel: string;
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
  horsePredictionColumnModelProb: string;
  horsePredictionColumnOdds: string;
  horsePredictionColumnEdge: string;
  horseTopDriversLabel: string;
  horseDataFreshnessLabel: string;
  horseDataFreshnessLive: string;
  horseDataFreshnessFallback: string;
  horseModelVersionLabel: string;
  horseProfilesUsedLabel: string;
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
  horseStakeClearAriaLabel: string;
  horseSuggestionRankLabel: string;
  horseEstimatedPayoutTitle: string;
  horseEstimatedReturnLabel: string;
  horseEstimatedProfitLabel: string;
  horseEstimatedRoiLabel: string;
  horseEstimatedRoiDisclaimer: string;
  horseEstimatedPayoutDisclaimer: string;
};

export const copy: Record<Locale, CopyShape> = {
  en: {
    appTitle: "Mobile Betting Assistant",
    navHome: "Home",
    navHistory: "History",
    navAnalytics: "Performance",
    mark6: "Mark Six",
    horse: "Horse Racing",
    selectDate: "Select Date",
    generate: "Generate Suggestions",
    generating: "Generating...",
    goToHkjc: "Go to HKJC",
    suggestionsTitle: "Predictions",
    explanationTitle: "Explanation",
    confidenceTitle: "Confidence",
    confidenceBandLow: "Low",
    confidenceBandMedium: "Medium",
    confidenceBandHigh: "High",
    mark6ManualChipAriaLabel: "Mark Six number {number}",
    errorGenerateSuggestionsFailed:
      "Couldn't generate suggestions. Please try again.",
    errorMark6OverviewFailed: "Couldn't load the overview. Please try again.",
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
    footerCompliance: "Analysis only. Visit HKJC for official betting.",
    footerHkjcLink: "Open HKJC",
    donationButton: "Support this site",
    donationHint: "Like the service? A small AlipayHK donation helps keep it running.",
    donationQrTitle: "Support with AlipayHK",
    donationQrDesktopHint: "On desktop, scan this QR code with AlipayHK.",
    donationQrMobileHint:
      "On mobile, long-press or open the QR image, save/screenshot it, then choose it from AlipayHK Scan > Album.",
    donationQrOpenImage: "Open QR image",
    donationQrBack: "Back to previous page",
    donationQrClose: "Close",
    historyTitle: "Past Winners",
    analyticsTitle: "Performance & Trust",
    historyDate: "Date",
    historyRace: "Race",
    historyResult: "Results",
    historyNote: "AI Notes",
    historyNoRowsMessage: "No results to show.",
    historyHorseRangeLabel: "Date range",
    historyHorseRangeWeek: "Past 14 days",
    historyHorseRangeAll: "All available",
    historyHorseVenueSt: "Sha Tin",
    historyHorseVenueHv: "Happy Valley",
    historyHorseMeetingsHeading: "Race day",
    historyHorseAccordionSummary: "Full results ({count})",
    historyHorseMoreLines: "+{count} more lines",
    analyticsConfidence: "Confidence Distribution",
    analyticsTrend: "Suggestion Outcome Trend",
    analyticsHorseBacktestTitle: "Horse Backtest Metrics",
    analyticsHorseBacktestTop1: "Top-1 Hit Rate",
    analyticsHorseBacktestSamples: "Evaluated Races",
    analyticsHorseCalibrationTitle: "Confidence Calibration",
    analyticsHorseCalibrationBand: "Band",
    analyticsHorseCalibrationHitRate: "Hit Rate",
    analyticsHorseCalibrationSample: "Samples",
    analyticsQuickReadTitle: "Quick Read",
    analyticsQuickReadSubtitle:
      "Simple health signals to help users judge reliability before using picks.",
    analyticsMetricRecentAccuracy: "Recent Accuracy",
    analyticsMetricRecentAccuracyHint: "How often the top pick won in backtested races.",
    analyticsMetricConfidenceNow: "Current Confidence",
    analyticsMetricConfidenceNowHint: "Dominant confidence level in recent model outputs.",
    analyticsMetricDataStatus: "Data Status",
    analyticsMetricDataStatusHint: "Shows whether metrics are based on live race data.",
    analyticsDataStatusLive: "Live data",
    analyticsDataStatusLimited: "Limited data",
    analyticsAdvancedDetails: "Advanced Details",
    analyticsAdvancedDetailsHint:
      "Technical charts and calibration tables for internal model review.",
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
    horseCompletedRacesLabel: "Completed races",
    horseUpcomingRacesLabel: "Upcoming races",
    horseRaceStatusResult: "Result",
    horseRaceStatusUpcoming: "Upcoming",
    horseRaceStatusAwaiting: "Awaiting official result",
    horseRaceDayListLabel: "Races on",
    horseRaceDayRefreshHint: "Official results refresh automatically on race day.",
    horsePredictionHitLabel: "Prediction matched the winner",
    horsePredictionMissLabel: "Prediction did not match the winner",
    horsePastDateResultsMode: "Past date selected: showing official race results only.",
    horseOfficialWinnerLabel: "Official Winner",
    horseOfficialTopFinishersLabel: "Top Finishers",
    horseResultComparisonTitle: "Prediction vs official result",
    horseResultComparisonPosition: "Pos",
    horseResultComparisonPredicted: "Your prediction",
    horseResultComparisonActual: "Official result",
    horseResultComparisonNoData: "—",
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
    mark6GenerateCountLabel: "Set How Many Sets",
    mark6GenerateCountOptionSets: "sets",
    mark6NumberMixLabel: "Number Mix Style",
    mark6NumberMixMixed: "Mixed small + big",
    mark6NumberMixSmallOnly: "Small numbers only",
    mark6NumberMixBigOnly: "Big numbers only",
    mark6GeneratedSetsLabel: "Generated sets",
    mark6NumberProbabilityLabel: "Model likelihood per number",
    mark6OverviewAction: "View 1-49 Overview",
    mark6OverviewTitle: "Mark Six 1-49 Overview",
    mark6OverviewSubtitle:
      "Trained model likelihood for every number, refreshed from HKJC history and previous-draw signals.",
    mark6OverviewLoading: "Loading model overview...",
    mark6OverviewRankLabel: "Rank",
    mark6OverviewProbabilityLabel: "Likelihood",
    mark6OverviewFiveYearCountLabel: "5-year hits",
    mark6MixGeneratedSetsAction: "Mix Within Generated Sets",
    mark6MixedSetsLabel: "Mixed sets",
    mark6MixNotEnoughNumbers:
      "Need at least 2 generated sets and enough unique numbers to mix.",
    mark6CopyAction: "Copy",
    mark6CopySuccess: "Copied to clipboard.",
    mark6CopyFailed: "Unable to copy. Please try again.",
    mark6SetLabel: "Set",
    mark6BankerLabel: "Banker",
    mark6SelectionsLabel: "Selections",
    mark6EstimatedCombinationsLabel: "Estimated combinations",
    mark6UpcomingDrawDatesLabel: "Upcoming draw dates",
    mark6UpcomingDrawDatesLoading: "Loading draw dates...",
    mark6UpcomingDrawDatesFallback:
      "Using estimated draw pattern (Tue/Thu/Sat) while live schedule is unavailable.",
    mark6PreviousDrawTitle: "Previous Night Mark Six",
    mark6PreviousDrawDateLabel: "Draw date",
    mark6PreviousDrawSpecialLabel: "Special",
    mark6PreviousDrawLiveSource: "HKJC live result",
    mark6PreviousDrawLoading: "Loading latest Mark Six result...",
    mark6PreviousDrawUnavailable: "Latest Mark Six result is unavailable right now.",
    mark6ImpactBestLabel: "Best previous-draw impact",
    mark6MatchedNumbersLabel: "Matched numbers",
    mark6ImpactNearWinning: "Near-winning signal: several selected numbers overlapped with the previous draw.",
    mark6ImpactSomeImpact: "Some impact: a couple of selected numbers overlapped, but it was still short of a near win.",
    mark6ImpactOffMark: "Off the mark: very few selected numbers overlapped with the previous draw.",
    mark6NextDrawLeanTitle: "Next draw — highest model scores",
    mark6NextDrawLeanSubtitle:
      "These six numbers rank at the top after the same blend the app uses for suggestions: multi-year draw history, then a weighting pass on the latest official result (nearby numbers, mirror pairs 50−n, light same-decade nudges, and slightly lower emphasis on immediate repeats). Percentages are relative model scores, not true win odds.",
    mark6NextDrawLeanScoreLabel: "Score {score}%",
    mark6NextDrawLeanDisclaimer:
      "For exploration only. Lottery outcomes are random; this is not a payout or investment claim.",
    mark6NextDrawLeanMoreSetsAction: "More high-score picks",
    mark6NextDrawLeanResetSetsAction: "Restore top six",
    mark6NextDrawLeanRankBandLabel: "Model ranks {start}–{end}",
    mark6PersonaSectionTitle: "Analysis persona",
    mark6PersonaSectionSubtitle: "Choose the analytical lens used for insights and generated sets.",
    mark6PersonaLotteryAnalyst: "Lottery Analyst",
    mark6PersonaLotteryAnalystDescription: "Professional frequency, balance, and hot/cold analysis.",
    mark6PersonaGameTheorist: "Game Theorist",
    mark6PersonaGameTheoristDescription: "Diversification using common-selection pattern proxies.",
    mark6PersonaPatternFinder: "Pattern Finder",
    mark6PersonaPatternFinderDescription: "Investigates repeating pairs, triples, clusters, and streaks.",
    mark6QueryHotCold: "Hot & Cold Numbers",
    mark6QueryOddEven: "Odd/Even Analysis",
    mark6QueryRepeatingPatterns: "Repeating Patterns",
    mark6QueryRecentTrends: "Recent Trends",
    mark6AnalysisTitle: "Persona analysis",
    mark6AnalysisLoading: "Analyzing historical draws...",
    mark6AnalysisError: "Unable to load Mark Six analysis right now.",
    mark6AnalysisDrawWindow: "Draw window",
    mark6AnalysisDraws: "draws analyzed",
    mark6AnalysisHeatmap: "1–49 frequency heatmap",
    mark6AnalysisFrequency: "Most frequent numbers",
    mark6AnalysisOddEven: "Odd / even distribution",
    mark6AnalysisHighLow: "Low / high distribution",
    mark6AnalysisOdd: "Odd",
    mark6AnalysisEven: "Even",
    mark6AnalysisLow: "Low 1–24",
    mark6AnalysisHigh: "High 25–49",
    mark6AnalysisInsights: "Analytical read",
    mark6AnalysisSuggested: "Explore next",
    mark6AnalysisSourceLive: "Historical database",
    mark6AnalysisSourceFallback: "Limited sample data",
    mark6AnalysisProxyNote: "Common-selection scores are statistical proxies, not actual ticket-sales data.",
    mark6AnalysisFeedTitle: "Analysis feed",
    mark6AnalysisFeedSubtitle: "Generated from the selected historical window; not community posts.",
    mark6InsightHot: "Most active numbers: {numbers}.",
    mark6InsightCold: "Least active numbers: {numbers}.",
    mark6InsightOddEven: "Historical split: {value}% odd and {secondary}% even.",
    mark6InsightHighLow: "Historical split: {value}% low and {secondary}% high.",
    mark6InsightPair: "Leading repeated pair: {numbers}, seen {value} times.",
    mark6InsightTriple: "Leading repeated triple: {numbers}, seen {value} times.",
    mark6InsightMomentum: "Positive recent frequency movement: {numbers}.",
    mark6InsightProxy: "{value}% of drawn numbers were 1–31; {secondary}% of draws contained consecutive numbers.",
    mark6ActivePersonaLabel: "Active approach",
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
    horsePredictionColumnModelProb: "Model Prob",
    horsePredictionColumnOdds: "Odds",
    horsePredictionColumnEdge: "Edge Score",
    horseTopDriversLabel: "Top Drivers (Explainability)",
    horseDataFreshnessLabel: "Data",
    horseDataFreshnessLive: "Live",
    horseDataFreshnessFallback: "Fallback",
    horseModelVersionLabel: "Model",
    horseProfilesUsedLabel: "Profiles",
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
    horseStakeClearAriaLabel: "Clear stake amount",
    horseSuggestionRankLabel: "Rank #{rank}",
    horseEstimatedPayoutTitle: "Estimated Payout (Pool-based)",
    horseEstimatedReturnLabel: "Return",
    horseEstimatedProfitLabel: "Profit",
    horseEstimatedRoiLabel: "Gross ROI",
    horseEstimatedRoiDisclaimer:
      "Gross ROI counts money returned against stake; profit is the net win or loss after stake.",
    horseEstimatedPayoutDisclaimer:
      "Estimate only. Final dividend depends on pool size, market bets, and official result settlement.",
  },
  "zh-HK": {
    appTitle: "流動投注助手",
    navHome: "主頁",
    navHistory: "歷史",
    navAnalytics: "表現",
    mark6: "六合彩",
    horse: "賽馬",
    selectDate: "選擇日期",
    generate: "生成推薦",
    generating: "正在生成...",
    goToHkjc: "前往香港賽馬會",
    suggestionsTitle: "預測結果",
    explanationTitle: "解說",
    confidenceTitle: "信心等級",
    confidenceBandLow: "低",
    confidenceBandMedium: "中",
    confidenceBandHigh: "高",
    mark6ManualChipAriaLabel: "六合彩號碼 {number}",
    errorGenerateSuggestionsFailed: "無法生成推薦，請稍後再試。",
    errorMark6OverviewFailed: "無法載入總覽，請稍後再試。",
    progressSteps: ["正在獲取資料...", "正在分析...", "正在生成推薦...", "完成。"],
    noSuggestionYet: "請先選擇遊戲與日期，然後生成推薦。",
    disclaimer: "僅供娛樂用途，不保證中獎，並非財務建議。",
    footerDisclaimer: "僅供娛樂用途，不保證中獎。本應用不處理任何投注。",
    footerCompliance: "只供分析。正式投注請前往香港賽馬會。",
    footerHkjcLink: "前往香港賽馬會",
    donationButton: "支持本站",
    donationHint: "喜歡這個服務？可透過 AlipayHK 小額支持網站營運。",
    donationQrTitle: "透過 AlipayHK 支持",
    donationQrDesktopHint: "如使用電腦，請用 AlipayHK 掃描此 QR Code。",
    donationQrMobileHint:
      "如使用手機，請長按或打開 QR 圖片並儲存/截圖，再到 AlipayHK 掃描 > 相簿選取圖片。",
    donationQrOpenImage: "打開 QR 圖片",
    donationQrBack: "返回上一頁",
    donationQrClose: "關閉",
    historyTitle: "過往結果",
    analyticsTitle: "表現與可信度",
    historyDate: "日期",
    historyRace: "場次",
    historyResult: "結果",
    historyNote: "AI 備註",
    historyNoRowsMessage: "暫無可查記錄。",
    historyHorseRangeLabel: "日期範圍",
    historyHorseRangeWeek: "過去 14 日",
    historyHorseRangeAll: "全部顯示",
    historyHorseVenueSt: "沙田",
    historyHorseVenueHv: "跑馬地",
    historyHorseMeetingsHeading: "賽馬日",
    historyHorseAccordionSummary: "完整名次（{count} 行）",
    historyHorseMoreLines: "另有 {count} 行",
    analyticsConfidence: "信心分佈",
    analyticsTrend: "推薦結果趨勢",
    analyticsHorseBacktestTitle: "賽馬回測指標",
    analyticsHorseBacktestTop1: "頭馬命中率",
    analyticsHorseBacktestSamples: "已評估場次",
    analyticsHorseCalibrationTitle: "信心校準",
    analyticsHorseCalibrationBand: "等級",
    analyticsHorseCalibrationHitRate: "命中率",
    analyticsHorseCalibrationSample: "樣本",
    analyticsQuickReadTitle: "快速重點",
    analyticsQuickReadSubtitle: "用最簡單的指標，幫助用戶判斷目前推薦是否可靠。",
    analyticsMetricRecentAccuracy: "近期準確率",
    analyticsMetricRecentAccuracyHint: "回測中頭號推薦實際跑出頭馬的比例。",
    analyticsMetricConfidenceNow: "目前信心",
    analyticsMetricConfidenceNowHint: "近期模型輸出中最常見的信心等級。",
    analyticsMetricDataStatus: "資料狀態",
    analyticsMetricDataStatusHint: "顯示指標是否主要來自即時賽馬資料。",
    analyticsDataStatusLive: "即時資料",
    analyticsDataStatusLimited: "資料有限",
    analyticsAdvancedDetails: "進階細節",
    analyticsAdvancedDetailsHint: "提供技術圖表與校準表，供內部模型檢視。",
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
    horseCompletedRacesLabel: "已完成賽事",
    horseUpcomingRacesLabel: "即將開跑賽事",
    horseRaceStatusResult: "賽果",
    horseRaceStatusUpcoming: "即將開跑",
    horseRaceStatusAwaiting: "等候官方賽果",
    horseRaceDayListLabel: "賽日賽事",
    horseRaceDayRefreshHint: "賽馬日會自動更新官方賽果。",
    horsePredictionHitLabel: "預測命中冠軍",
    horsePredictionMissLabel: "預測未中冠軍",
    horsePastDateResultsMode: "已選過往日期：只顯示該日官方賽果。",
    horseOfficialWinnerLabel: "官方冠軍",
    horseOfficialTopFinishersLabel: "前列名次",
    horseResultComparisonTitle: "預測對照官方賽果",
    horseResultComparisonPosition: "名次",
    horseResultComparisonPredicted: "你的預測",
    horseResultComparisonActual: "官方賽果",
    horseResultComparisonNoData: "—",
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
    mark6GenerateCountLabel: "設定組數",
    mark6GenerateCountOptionSets: "組",
    mark6NumberMixLabel: "號碼分佈",
    mark6NumberMixMixed: "大小混合",
    mark6NumberMixSmallOnly: "只要細號",
    mark6NumberMixBigOnly: "只要大號",
    mark6GeneratedSetsLabel: "已生成組合",
    mark6NumberProbabilityLabel: "每個號碼的模型機率",
    mark6OverviewAction: "查看1-49總覽",
    mark6OverviewTitle: "六合彩1-49總覽",
    mark6OverviewSubtitle: "每個號碼的訓練模型機率，按香港賽馬會歷史及上一期訊號更新。",
    mark6OverviewLoading: "正在載入模型總覽...",
    mark6OverviewRankLabel: "排名",
    mark6OverviewProbabilityLabel: "機率",
    mark6OverviewFiveYearCountLabel: "5年出現次數",
    mark6MixGeneratedSetsAction: "混合同批組合",
    mark6MixedSetsLabel: "混合後組合",
    mark6MixNotEnoughNumbers: "需要至少2組已生成組合及足夠不重複號碼才可混合。",
    mark6CopyAction: "複製",
    mark6CopySuccess: "已複製到剪貼板。",
    mark6CopyFailed: "無法複製，請再試一次。",
    mark6SetLabel: "組合",
    mark6BankerLabel: "膽",
    mark6SelectionsLabel: "拖碼",
    mark6EstimatedCombinationsLabel: "預計組合數",
    mark6UpcomingDrawDatesLabel: "即將開彩日期",
    mark6UpcomingDrawDatesLoading: "正在載入開彩日期...",
    mark6UpcomingDrawDatesFallback: "暫時未能取得官方日程，先以週二/四/六估算顯示。",
    mark6PreviousDrawTitle: "上一晚六合彩",
    mark6PreviousDrawDateLabel: "開彩日期",
    mark6PreviousDrawSpecialLabel: "特別號碼",
    mark6PreviousDrawLiveSource: "香港賽馬會即時結果",
    mark6PreviousDrawLoading: "正在載入最新六合彩結果...",
    mark6PreviousDrawUnavailable: "暫時未能取得最新六合彩結果。",
    mark6ImpactBestLabel: "最佳接近命中比例",
    mark6MatchedNumbersLabel: "命中號碼",
    mark6ImpactNearWinning: "接近中獎訊號：多個已選號碼與上一期重疊。",
    mark6ImpactSomeImpact: "有少量影響：有兩個號碼重疊，但仍未算接近中獎。",
    mark6ImpactOffMark: "偏離結果：與上一期重疊的號碼很少。",
    mark6NextDrawLeanTitle: "下一期 — 模型分數最高六個號碼",
    mark6NextDrawLeanSubtitle:
      "此六個號碼在與建議相同的演算下排名最前：先用近年的開彩歷史統計，再以最近一期官方結果作權重調整（鄰近號碼、鏡像號碼 50−n、同頭（十個一組）輕微加成，並對即時重複略為降權）。顯示百分比為相對模型分數，並非實際中獎機率。",
    mark6NextDrawLeanScoreLabel: "分數 {score}%",
    mark6NextDrawLeanDisclaimer: "僅供參考探索。抽獎結果具隨機性，並非派彩或投資建議。",
    mark6NextDrawLeanMoreSetsAction: "更多高分組合",
    mark6NextDrawLeanResetSetsAction: "還原本期首選六個號碼",
    mark6NextDrawLeanRankBandLabel: "模型排名第 {start}–{end} 位",
    mark6PersonaSectionTitle: "分析角色",
    mark6PersonaSectionSubtitle: "選擇用於分析及生成組合的角度。",
    mark6PersonaLotteryAnalyst: "六合彩分析師",
    mark6PersonaLotteryAnalystDescription: "以專業方式分析頻率、比例及冷熱門號碼。",
    mark6PersonaGameTheorist: "博弈理論家",
    mark6PersonaGameTheoristDescription: "利用常見選號模式代理指標分散組合。",
    mark6PersonaPatternFinder: "模式調查員",
    mark6PersonaPatternFinderDescription: "調查重複配對、三連組合、群組及連續走勢。",
    mark6QueryHotCold: "冷熱門號碼",
    mark6QueryOddEven: "單雙分析",
    mark6QueryRepeatingPatterns: "重複模式",
    mark6QueryRecentTrends: "近期走勢",
    mark6AnalysisTitle: "角色分析",
    mark6AnalysisLoading: "正在分析歷史開彩...",
    mark6AnalysisError: "暫時未能載入六合彩分析。",
    mark6AnalysisDrawWindow: "分析期數",
    mark6AnalysisDraws: "期已分析",
    mark6AnalysisHeatmap: "1–49 頻率熱圖",
    mark6AnalysisFrequency: "最常出現號碼",
    mark6AnalysisOddEven: "單雙分佈",
    mark6AnalysisHighLow: "細大號分佈",
    mark6AnalysisOdd: "單數",
    mark6AnalysisEven: "雙數",
    mark6AnalysisLow: "細號 1–24",
    mark6AnalysisHigh: "大號 25–49",
    mark6AnalysisInsights: "分析解讀",
    mark6AnalysisSuggested: "繼續探索",
    mark6AnalysisSourceLive: "歷史資料庫",
    mark6AnalysisSourceFallback: "有限示例資料",
    mark6AnalysisProxyNote: "常見選號分數只屬統計代理指標，並非實際投注銷售資料。",
    mark6AnalysisFeedTitle: "分析動態",
    mark6AnalysisFeedSubtitle: "按所選歷史範圍生成，並非社群貼文。",
    mark6InsightHot: "近期最活躍號碼：{numbers}。",
    mark6InsightCold: "近期最少出現號碼：{numbers}。",
    mark6InsightOddEven: "歷史分佈：單數 {value}%，雙數 {secondary}%。",
    mark6InsightHighLow: "歷史分佈：細號 {value}%，大號 {secondary}%。",
    mark6InsightPair: "最高重複配對：{numbers}，共出現 {value} 次。",
    mark6InsightTriple: "最高重複三連組合：{numbers}，共出現 {value} 次。",
    mark6InsightMomentum: "近期頻率上升號碼：{numbers}。",
    mark6InsightProxy: "開出號碼中 {value}% 為 1–31；{secondary}% 期數包含連號。",
    mark6ActivePersonaLabel: "目前分析方式",
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
    horsePredictionColumnModelProb: "模型機率",
    horsePredictionColumnOdds: "賠率",
    horsePredictionColumnEdge: "優勢分數",
    horseTopDriversLabel: "主要驅動因素（可解釋）",
    horseDataFreshnessLabel: "資料",
    horseDataFreshnessLive: "即時",
    horseDataFreshnessFallback: "備援",
    horseModelVersionLabel: "模型",
    horseProfilesUsedLabel: "分析檔案",
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
    horseStakeClearAriaLabel: "清除投注金額",
    horseSuggestionRankLabel: "第{rank}名",
    horseEstimatedPayoutTitle: "預計派彩（彩池制）",
    horseEstimatedReturnLabel: "回報",
    horseEstimatedProfitLabel: "盈利",
    horseEstimatedRoiLabel: "總回報率",
    horseEstimatedRoiDisclaimer:
      "總回報率計算取回金額相對投注本金；盈利才是扣除本金後的實際盈虧。",
    horseEstimatedPayoutDisclaimer:
      "僅為估算。最終派彩取決於彩池金額、市場投注分佈及官方賽果結算。",
  },
};

export function formatConfidenceBandLabel(band: string | undefined, locale: Locale): string {
  const t = copy[locale];
  switch (band) {
    case "High":
      return t.confidenceBandHigh;
    case "Medium":
      return t.confidenceBandMedium;
    default:
      return t.confidenceBandLow;
  }
}
