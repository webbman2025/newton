# Mark Six Persona Analysis

## Personas

### Lottery Analyst
Analyzes historical frequency, odd/even balance, hot and cold numbers, and recent trends. Explanations use ratios and structured summaries and always state that analysis is not a guaranteed prediction.

### Game Theorist
Focuses on diversification and combinations that avoid common-selection traits such as birthday-heavy sets, consecutive sequences, repeated endings, and narrow spreads.

The app has no access to HKJC ticket-selection data. Any popularity statement is explicitly labelled as a statistical common-selection proxy, not actual sales or player behavior.

### Pattern Finder
Investigates repeating pairs, triples, streaks, and number clusters across historical draws.

## Guided Query Library
- Hot & Cold Numbers
- Odd/Even Analysis
- Repeating Patterns
- Recent Trends

## UX Placement
- Scrollable persona chips under the Mark Six tab header.
- Large touch-friendly analysis buttons below the persona selector.
- Collapsible results card with a heatmap, frequency chart, and suggested queries.
- Swipeable probability cards for odd/even and high/low distributions.
- Generated analytical insight feed at the bottom of the Mark Six tab.
- Sticky compliance footer across all tabs: “Analysis only. Visit HKJC for official betting.”

## Data Integrity
- Historical draws are sourced from the configured database and HKJC ingestion pipeline.
- A clearly identified local sample is used only when the database is unavailable.
- Model scores and historical frequencies are analytical signals, not true winning probabilities.
- The insight feed is generated from the current analysis payload; it is not a social or user-generated community feed.
