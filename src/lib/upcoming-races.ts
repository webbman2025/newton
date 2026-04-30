import { HorseRacingAPI } from "hkjc-api";

export type UpcomingRaceRunner = {
  horseNumber: string;
  horseName: string;
  horseNameZh?: string;
  jockey: string;
  jockeyZh?: string;
  trainer: string;
  trainerZh?: string;
  draw: string;
  winOdds?: string;
};

export type UpcomingRace = {
  venueCode: "ST" | "HV";
  venueName: string;
  venueNameZh: string;
  raceNo: number;
  raceName: string;
  raceNameZh?: string;
  postTime: string;
  distance: number;
  raceClass: string;
  raceClassZh?: string;
  runners: UpcomingRaceRunner[];
};

type HkjcMeeting = {
  venueCode: string;
  races?: Array<{
    no: number;
    status?: string;
    raceName_en?: string;
    raceName_ch?: string;
    postTime?: string;
    distance?: number;
    raceClass_en?: string;
    raceClass_ch?: string;
    runners?: Array<{
      no?: string;
      name_en?: string;
      name_ch?: string;
      barrierDrawNumber?: string;
      jockey?: { name_en?: string; name_ch?: string };
      trainer?: { name_en?: string; name_ch?: string };
      winOdds?: string;
      win_odd?: string;
      fixedOddsWin?: string;
    }>;
  }>;
};

function venueLabel(code: "ST" | "HV") {
  return {
    en: code === "ST" ? "Sha Tin" : "Happy Valley",
    zh: code === "ST" ? "沙田" : "跑馬地",
  };
}

export async function getUpcomingRaces(limit = 8): Promise<UpcomingRace[]> {
  const api = new HorseRacingAPI();
  const meetings = (await api.getAllRaces()) as unknown as HkjcMeeting[];
  const now = Date.now();

  const upcoming: UpcomingRace[] = [];
  for (const meeting of meetings) {
    const venueCode = meeting.venueCode === "ST" || meeting.venueCode === "HV"
      ? meeting.venueCode
      : null;
    if (!venueCode) {
      continue;
    }

    for (const race of meeting.races ?? []) {
      if (!race.postTime || race.status === "RESULT" || race.status === "CLOSED") {
        continue;
      }

      const time = new Date(race.postTime).getTime();
      if (Number.isNaN(time) || time < now) {
        continue;
      }

      const runners = (race.runners ?? []).map((runner) => {
        const oddsCandidate =
          runner.winOdds ??
          runner.win_odd ??
          runner.fixedOddsWin ??
          ((runner as Record<string, unknown>).odds as string | undefined);
        return {
          horseNumber: runner.no ?? "-",
          horseName: runner.name_en ?? "Unknown",
          horseNameZh: runner.name_ch,
          jockey: runner.jockey?.name_en ?? "-",
          jockeyZh: runner.jockey?.name_ch,
          trainer: runner.trainer?.name_en ?? "-",
          trainerZh: runner.trainer?.name_ch,
          draw: runner.barrierDrawNumber ?? "-",
          winOdds: oddsCandidate,
        };
      });
      const venueName = venueLabel(venueCode);

      upcoming.push({
        venueCode,
        venueName: venueName.en,
        venueNameZh: venueName.zh,
        raceNo: race.no,
        raceName: race.raceName_en ?? `Race ${race.no}`,
        raceNameZh: race.raceName_ch,
        postTime: race.postTime,
        distance: race.distance ?? 0,
        raceClass: race.raceClass_en ?? "-",
        raceClassZh: race.raceClass_ch,
        runners,
      });
    }
  }

  return upcoming
    .sort((a, b) => new Date(a.postTime).getTime() - new Date(b.postTime).getTime())
    .slice(0, limit);
}
