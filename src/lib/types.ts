// App-level domain types. These use camelCase; the Supabase data layer maps
// to/from the snake_case Postgres columns.

export type Tier = "lower" | "upper";

export interface Division {
  id: string; // e.g. "g1-low"
  name: string; // e.g. "G1"
  tier: Tier;
  tierLabel: string; // rating range, e.g. "0.5 – 2.4"
}

export interface Team {
  id: string;
  divisionId: string;
  seed: number;
  p1: string;
  p2: string;
  r1: number | null;
  r2: number | null;
  placeholder: boolean;
}

export type FixtureStatus = "pending" | "completed" | "walkover";

// A set is [team1 games, team2 games]. The deciding 3rd set is a championship tiebreak.
export type SetScore = [number, number];

export interface Fixture {
  id: string;
  code: string | null; // display id, e.g. "F0001"
  divisionId: string;
  round: number;
  team1Id: string;
  team2Id: string;
  status: FixtureStatus;
  sets: SetScore[] | null;
  tbc: "both" | "one" | null;
  homeTeamId: string | null;
  enteredBy: string | null;
  enteredAt: number | null;
  notes: string;
}

export interface Settings {
  lowerStatus: "full" | "available";
  upperStatus: "full" | "available";
}

export interface StandingRow {
  teamId: string;
  team: Team;
  P: number;
  W: number;
  L: number;
  Pts: number;
  Bonus: number;
  SF: number;
  SA: number;
  GF: number;
  GA: number;
  h2h: Record<string, number>;
  form: ("W" | "L")[]; // chronological results (oldest first)
  rank: number;
}

export interface Qualifier extends StandingRow {
  divName: string;
  divId: string;
  seed: number;
  /** Set when the occupant of this qualifying slot is not yet decided — a
   *  play-off is outstanding. The slot still seeds normally so the bracket
   *  shape holds; only the name is withheld. */
  pending?: string;
}

export type BracketSlot =
  | Qualifier
  | { placeholder: true; label: string }
  | null;

export interface BracketMatch {
  id: string;
  a: BracketSlot;
  b: BracketSlot;
}

export interface BracketMeta {
  /** true when no first-round tie pairs teams from the same division */
  crossDivision: boolean;
  note: string;
}

export interface Bracket {
  r1: BracketMatch[];
  qf: BracketMatch[];
  sf: BracketMatch[];
  f: BracketMatch[];
  third: BracketMatch[];
  meta?: BracketMeta;
}
