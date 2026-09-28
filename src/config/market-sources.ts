export const MARKET_SOURCES = {
  forexFactoryCalendar: "https://www.forexfactory.com/calendar",
  forexFactoryWeeklyJson: "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
  investingEconomicCalendar: "https://br.investing.com/economic-calendar/",
  investingWidgetBuilder: "https://br.investing.com/webmaster-tools/economiccalendar",
  exnessApiHelp: "https://get.exness.help/hc/pt-br/articles/27866287512476-API-da-Exness",
} as const;

export const INVESTING_WIDGET_URL = process.env.NEXT_PUBLIC_INVESTING_ECONOMIC_CALENDAR_WIDGET_URL ?? "";
