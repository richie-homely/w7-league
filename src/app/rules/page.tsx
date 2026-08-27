import Link from "next/link";
import { C, F } from "@/theme/tokens";
import { KeanoCredit } from "@/components/KeanoCredit";

export const metadata = { title: "Rules & Format · W7 Summer League 2026" };

export default function RulesPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.body }}>
      {/* Header */}
      <div
        style={{
          background: C.bg,
          borderBottom: `1px solid ${C.border}`,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ fontFamily: F.display, fontSize: 20, color: C.text, letterSpacing: "0.03em" }}>
          SUMMER LEAGUES 2026
        </div>
        <div style={{ flex: 1 }} />
        <Link
          href="/summer-2026"
          style={{
            fontSize: 12,
            color: C.mute,
            textDecoration: "none",
            padding: "6px 12px",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
          }}
        >
          ← Back
        </Link>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px" }}>

        {/* Title */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: F.display, fontSize: 36, color: C.accent, letterSpacing: "0.04em", lineHeight: 1 }}>
            W7 PADEL SUMMER LEAGUE 2026
          </div>
          <div style={{ color: C.mute, fontSize: 14, marginTop: 8 }}>Format &amp; Rules</div>
        </div>

        {/* Prize Money */}
        <Section title="Prize Money 💰">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {[
              { place: "🥇 1st Place", amount: "€500", color: "#FFD700" },
              { place: "🥈 2nd Place", amount: "€250", color: "#C0C0C0" },
              { place: "🥉 3rd Place", amount: "€100", color: "#CD7F32" },
              { place: "🎖️ 4th Place", amount: "€50",  color: C.mute },
            ].map(({ place, amount, color }) => (
              <div
                key={place}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "14px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 14 }}>{place}</span>
                <span style={{ fontFamily: F.mono, fontSize: 18, fontWeight: 700, color }}>{amount}</span>
              </div>
            ))}
          </div>
          <P>
            The W7 Padel Summer League is a competitive team doubles league running throughout the summer using Playtomic.
          </P>
        </Section>

        {/* League Details */}
        <Section title="League Details">
          <InfoTable rows={[
            ["Start Date",       "Saturday, 6 June 2026"],
            ["Match Deadline",   "Saturday, 15 August 2026"],
            ["Duration",         "10 weeks"],
            ["Entry Fee",        "€50 per team"],
            ["Format",           "Team doubles"],
            ["Entry",            "Via Competitions on Playtomic"],
          ]} />
        </Section>

        {/* Divisions */}
        <Section title="Divisions">
          <P>There will be 5 divisions with 12 teams in each:</P>
          <ul style={ulStyle}>
            <li style={liStyle}>3 divisions at Playtomic rating <Highlight>0.5 – 2.4</Highlight></li>
            <li style={liStyle}>2 divisions at Playtomic rating <Highlight>2.5 – 5.5</Highlight></li>
          </ul>
          <P>Players must enter with their own partner. Individual entries will not be accepted.</P>
          <P style={{ color: C.mute }}>Extra divisions may be added based on demand.</P>
        </Section>

        {/* League Format */}
        <Section title="League Format">
          <ul style={ulStyle}>
            <li style={liStyle}>Every team plays every other team in their division</li>
            <li style={liStyle}><Highlight>11 guaranteed matches</Highlight> (subject to full sign-up)</li>
            <li style={liStyle}>90-minute matches</li>
            <li style={liStyle}>First team to win 2 sets wins</li>
          </ul>
          <P>If teams win one set each:</P>
          <ul style={ulStyle}>
            <li style={liStyle}>Third set becomes a <Highlight>Championship Tie-Break</Highlight></li>
            <li style={liStyle}>First to 10 points wins</li>
          </ul>
        </Section>

        {/* Game Format */}
        <Section title="Game Format">
          <ul style={ulStyle}>
            <li style={liStyle}>Maximum of 2 deuces per game</li>
            <li style={liStyle}>Third deuce becomes a <Highlight>golden point</Highlight></li>
          </ul>
        </Section>

        {/* Points System */}
        <Section title="Points System">
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={pointsCard}>
              <div style={{ fontFamily: F.mono, fontSize: 28, fontWeight: 700, color: C.accent }}>3</div>
              <div style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>Points for a win</div>
            </div>
            <div style={pointsCard}>
              <div style={{ fontFamily: F.mono, fontSize: 28, fontWeight: 700, color: C.accentDim }}>+1</div>
              <div style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>Bonus for straight-sets win</div>
            </div>
          </div>
          <P style={{ color: C.mute, fontSize: 13 }}>
            If a match is unfinished after 90 minutes, the score at time will stand.
          </P>
        </Section>

        {/* Fixtures & Scheduling */}
        <Section title="Fixtures &amp; Scheduling">
          <P>Weekly fixtures will be organised by the W7 Padel team. Fixtures and results are to be shared in your respective division WhatsApp groups.</P>
          <P>League tables will be updated <Highlight>live</Highlight> throughout the league on this site.</P>
          <P>Teams are responsible for:</P>
          <ul style={ulStyle}>
            <li style={liStyle}>Organising matches with opponents within the scheduled week</li>
            <li style={liStyle}>Booking their own court (€50 entry fee does not include court bookings)</li>
          </ul>
          <SubHeading>Recommended Playing Times</SubHeading>
          <InfoTable rows={[
            ["Saturdays",  "1pm – 6pm"],
            ["Sundays",    "1pm – 6pm"],
            ["Midweek",    "Any suitable available time"],
          ]} />
          <P style={{ marginTop: 16 }}>
            The <Highlight>designated home team</Highlight> is responsible for supplying balls fit for competition
            (suggested no older than 2 games).
          </P>
          <P>
            If a match is not completed during the scheduled week, teams are expected to catch up the following week.
            All league matches must be completed by <Highlight>Saturday, 15 August 2026</Highlight>.
          </P>
        </Section>

        {/* Substitutes */}
        <Section title="Substitutes">
          <P>If a player is injured or unavailable:</P>
          <ul style={ulStyle}>
            <li style={liStyle}>A substitute player may be used</li>
            <li style={liStyle}>Substitute rating must fall within the division rating range</li>
          </ul>
        </Section>

        {/* Knockout */}
        <Section title="Knockout Stages 🏆">
          <P>The <Highlight>Top 4 teams</Highlight> from each division qualify for the knockout stages.</P>
          <SubHeading>Quarter-Finals</SubHeading>
          <ul style={ulStyle}>
            <li style={liStyle}>1st vs 4th</li>
            <li style={liStyle}>2nd vs 3rd</li>
          </ul>
          <P>Semi-finals and finals will determine the overall champions.</P>
          <SubHeading>Knockout Dates</SubHeading>
          <P style={{ color: C.mute }}>
            Tournament dates are TBC. Dates will be arranged once league stages are completed.
          </P>
        </Section>

        <div style={{ marginTop: 8, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          <KeanoCredit />
        </div>
      </div>
    </div>
  );
}

// ── Local sub-components ─────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div
        style={{
          fontFamily: F.display,
          fontSize: 18,
          color: C.accent,
          letterSpacing: "0.06em",
          marginBottom: 14,
          paddingBottom: 8,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {title.toUpperCase()}
      </div>
      {children}
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 14, marginBottom: 6 }}>
      {children}
    </div>
  );
}

function P({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{ fontSize: 14, color: C.text, lineHeight: 1.65, margin: "0 0 10px", ...style }}>
      {children}
    </p>
  );
}

function Highlight({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: C.accent }}>{children}</strong>;
}

function InfoTable({ rows }: { rows: [string, string][] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 10 }}>
      {rows.map(([label, value]) => (
        <div
          key={label}
          style={{
            display: "grid",
            gridTemplateColumns: "160px 1fr",
            background: C.card,
            borderRadius: 6,
            padding: "9px 14px",
            fontSize: 13,
          }}
        >
          <span style={{ color: C.mute }}>{label}</span>
          <span style={{ color: C.text, fontWeight: 500 }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

const ulStyle: React.CSSProperties = {
  margin: "0 0 10px",
  paddingLeft: 20,
};

const liStyle: React.CSSProperties = {
  fontSize: 14,
  color: C.text,
  lineHeight: 1.7,
};

const pointsCard: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "16px 20px",
  textAlign: "center",
  minWidth: 120,
};
