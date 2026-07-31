// DTown East Alum - client-side app shell
// Static, data-snapshot PWA. No backend yet: the trade form is UI-only
// (see helper note on that page) until the real sync pipeline exists.

const app = document.getElementById("app");
const navLinks = document.querySelectorAll(".nav-links a");

function avatarPath(slug) {
  return "assets/avatars/" + slug + ".jpg";
}

function ownerBySlug(slug) {
  return OWNERS.find((o) => o.slug === slug);
}

function daysUntil(dateStr) {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function setActiveNav(route) {
  navLinks.forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === "#/" + route);
  });
}

function trophyIcons(count) {
  return '<i class="ti ti-trophy" aria-hidden="true"></i>'.repeat(count);
}

// Builds the "X received A, B from Y for C, D" sentence purely from
// each move's `to` field - the same field the source trade log already
// states unambiguously ("player -> destination team"). This exists
// specifically so trade direction is never hand-typed as prose again:
// a prior version stored a manually-written summary string per trade and
// one of them had the direction backwards (Mason/Jennings, reported
// 2026-07-24). Grouping by destination and mapping straight into the
// sentence removes that failure mode - there's no second, separately
// authored copy of "who sent what" for a transcription to drift from.
function tradeSummary(trade) {
  const byDest = {};
  const destOrder = [];
  trade.moves.forEach((m) => {
    if (!byDest[m.to]) {
      byDest[m.to] = [];
      destOrder.push(m.to);
    }
    byDest[m.to].push(m.player);
  });
  if (destOrder.length !== 2) {
    // Fallback for anything that isn't a clean two-team trade.
    return destOrder.map((d) => `${d} received ${byDest[d].join(", ")}`).join("; ");
  }
  const [teamA, teamB] = destOrder;
  return `${teamA} received ${byDest[teamA].join(", ")} from ${teamB} for ${byDest[teamB].join(", ")}`;
}

function championBannerHTML() {
  const champ = ownerBySlug(DEFENDING_CHAMPION);
  return `
    <div class="champion-banner">
      <img class="avatar-sm" src="${avatarPath(champ.slug)}" alt="${champ.name}" />
      <div>
        <div class="label">2025 champion</div>
        <div class="name owner-link" data-nav="owners/${champ.slug}">${champ.name} <i class="ti ti-trophy" aria-hidden="true" style="color:var(--gold-dark);font-size:15px;"></i></div>
      </div>
    </div>
  `;
}

// ---------- Season (default landing) ----------
function renderSeason() {
  const draftDays = daysUntil(SEASON_STATUS.draftDate);
  const keeperDays = daysUntil(SEASON_STATUS.keeperDeadline);
  const sortedBudgets = Object.keys(BUDGETS_2026).sort(
    (a, b) => BUDGETS_2026[b] - BUDGETS_2026[a]
  );

  app.innerHTML = `
    ${championBannerHTML()}
    <h1 class="section-title">Getting ready for the draft</h1>
    <div class="grid-2">
      <div class="stat-tile">
        <div class="label">Draft opens in</div>
        <div class="value">${Math.max(draftDays, 0)} days</div>
        <div class="sub">Mon, Sep 7 &middot; live auction</div>
      </div>
      <div class="stat-tile">
        <div class="label">Keeper deadline</div>
        <div class="value">${Math.max(keeperDays, 0)} days</div>
        <div class="sub">Sun, Sep 6</div>
      </div>
    </div>

    <h2 class="section-title">2026 draft budgets</h2>
    <div class="card">
      ${sortedBudgets
        .map((slug) => {
          const o = ownerBySlug(slug);
          return `<div class="budget-row">
            <span class="owner-link" data-nav="owners/${slug}">${o.name}</span>
            <span class="amount">$${BUDGETS_2026[slug]}</span>
          </div>`;
        })
        .join("")}
    </div>

    <h2 class="section-title">Recent activity</h2>
    <div class="card">
      ${RECENT_TRADES.map(
        (t) =>
          `<div style="font-size:12px;color:var(--navy-mid);padding:6px 0;border-bottom:0.5px solid var(--navy-light);">${t.date} &middot; ${tradeSummary(t)}</div>`
      ).join("")}
    </div>

    <div class="quick-tiles">
      <div class="quick-tile" data-nav="schedule"><i class="ti ti-calendar" aria-hidden="true"></i>Schedule</div>
      <div class="quick-tile" data-nav="trades"><i class="ti ti-arrows-exchange" aria-hidden="true"></i>Trades</div>
      <div class="quick-tile" data-nav="owners"><i class="ti ti-users" aria-hidden="true"></i>Owners</div>
      <div class="quick-tile" data-nav="free-agents"><i class="ti ti-list-search" aria-hidden="true"></i>Free agents</div>
      <div class="quick-tile" data-nav="history"><i class="ti ti-history" aria-hidden="true"></i>History</div>
      <div class="quick-tile" data-nav="constitution"><i class="ti ti-gavel" aria-hidden="true"></i>Constitution</div>
    </div>
  `;
  bindNavClicks();
}

// ---------- History ----------
function renderHistory() {
  const sorted = [...OWNERS].sort((a, b) => b.winPct - a.winPct);

  app.innerHTML = `
    ${championBannerHTML()}
    <h1 class="section-title">All-time standings</h1>
    <div class="table-header">
      <span></span><span></span><span>Owner</span><span>Record</span><span>Win%</span><span>Titles</span>
    </div>
    <div id="standings-rows"></div>
  `;

  const rows = document.getElementById("standings-rows");
  sorted.forEach((o, i) => {
    const row = document.createElement("div");
    row.className = "table-row";
    row.innerHTML = `
      <span style="color:var(--navy-mid);">${i + 1}</span>
      <img class="avatar-xs" src="${avatarPath(o.slug)}" alt="${o.name}" />
      <span class="owner-link" data-nav="owners/${o.slug}">${o.name}</span>
      <span>${o.record}</span>
      <span>${o.winPct.toFixed(1)}%</span>
      <span class="trophy-row">${trophyIcons(o.titles)}</span>
    `;
    rows.appendChild(row);
  });
  bindNavClicks();
}

// ---------- Owners list ----------
function renderOwnersList() {
  const sorted = [...OWNERS].sort((a, b) => b.winPct - a.winPct);
  app.innerHTML = `
    <h1 class="section-title">Owners</h1>
    <div class="owner-grid">
      ${sorted
        .map(
          (o) => `
        <div class="owner-card" data-nav="owners/${o.slug}">
          <div class="head">
            <img class="avatar-sm" src="${avatarPath(o.slug)}" alt="${o.name}" />
            <div class="name">${o.name}</div>
          </div>
          <div class="body">
            ${o.record} &middot; ${o.winPct.toFixed(1)}%<br/>
            <span class="trophy-row">${trophyIcons(o.titles)}</span>
          </div>
        </div>`
        )
        .join("")}
    </div>
  `;
  bindNavClicks();
}

// ---------- Owner profile ----------
function renderOwnerProfile(slug) {
  const o = ownerBySlug(slug);
  if (!o) {
    app.innerHTML = `<p>Owner not found. <a href="#/owners">Back to owners</a></p>`;
    return;
  }
  const budget = BUDGETS_2026[slug];
  app.innerHTML = `
    <div class="card" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
      <img class="avatar-lg" src="${avatarPath(o.slug)}" alt="${o.name}" />
      <div>
        <h1 class="section-title" style="margin:0;">${o.name}</h1>
        <div style="font-size:13px;color:var(--navy-mid);">${o.seasons} seasons &middot; ${o.team2025} (2025)</div>
        <div class="trophy-row" style="margin-top:6px;">${trophyIcons(o.titles)}</div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:16px;">
      <div class="stat-tile">
        <div class="label">All-time record</div>
        <div class="value" style="font-size:18px;">${o.record}</div>
        <div class="sub">${o.winPct.toFixed(1)}% win rate</div>
      </div>
      <div class="stat-tile">
        <div class="label">2026 draft budget</div>
        <div class="value" style="font-size:18px;color:var(--green-dark);">$${budget}</div>
        <div class="sub">before keeper costs</div>
      </div>
      <div class="stat-tile">
        <div class="label">Playoff appearances</div>
        <div class="value" style="font-size:18px;">${o.playoffs} / ${o.seasons}</div>
      </div>
      <div class="stat-tile">
        <div class="label">Finals record</div>
        <div class="value" style="font-size:18px;">${o.titles}-${o.runnerUp}</div>
        <div class="sub">${o.finals} finals appearances, ${o.third} third-place finishes</div>
      </div>
      <div class="stat-tile">
        <div class="label">Points for / against</div>
        <div class="value" style="font-size:18px;">${o.pf.toLocaleString()}</div>
        <div class="sub">${o.pa.toLocaleString()} against</div>
      </div>
      <div class="stat-tile">
        <div class="label">Highest single week</div>
        <div class="value" style="font-size:18px;">${o.highScore.toFixed(2)}</div>
      </div>
    </div>

    <p class="helper-note" style="margin-top:16px;">Draft results, trade log, and head-to-head vs. rivals tabs are scoped in the content spec and will land once the data model is wired to a real backend.</p>
    <p><a href="#/owners" class="owner-link">&larr; Back to owners</a></p>
  `;
}

// ---------- Constitution ----------
function settingsGroupHTML(rows) {
  return rows
    .map(
      (r) =>
        `<div class="budget-row"><span style="color:var(--navy-mid);">${r.label}</span><span style="font-weight:500;text-align:right;">${r.value}</span></div>`
    )
    .join("");
}

function proseHTML(paragraphs) {
  if (!paragraphs || !paragraphs.length) return "";
  return paragraphs
    .map((p) => `<p class="helper-note" style="margin:8px 0 0;">${p}</p>`)
    .join("");
}

function statusBadge(status) {
  const map = {
    passed: { label: "Passed", cls: "badge-passed" },
    rejected: { label: "Rejected", cls: "badge-rejected" },
    tied_rejected: { label: "Tied / rejected", cls: "badge-rejected" },
    pending: { label: "Pending vote", cls: "badge-pending" },
  };
  const m = map[status] || { label: status, cls: "" };
  return `<span class="status-badge ${m.cls}">${m.label}</span>`;
}

function renderConstitution() {
  const articlesHTML = CONSTITUTION_ARTICLES.map(
    (a) => `
      <h2 class="section-title">${a.title}</h2>
      <div class="card">
        ${settingsGroupHTML(a.rows)}
        ${proseHTML(a.prose)}
      </div>
    `
  ).join("");

  const docketHTML = DOCKET_2026.map(
    (d) => `
      <div class="card" style="margin-bottom:10px;">
        <div style="font-weight:600;color:var(--navy-dark);margin-bottom:4px;">${d.title}</div>
        <p class="helper-note" style="margin:0;">${d.detail}</p>
      </div>
    `
  ).join("");

  const archiveHTML = PROPOSAL_HISTORY.slice()
    .reverse()
    .map(
      (season) => `
        <details class="archive-season">
          <summary>${season.seasonVoted} vote &middot; for the ${season.effectiveSeason} season</summary>
          <div class="archive-list">
            ${season.proposals
              .map(
                (p) =>
                  `<div class="archive-row">${statusBadge(p.status)}<span>${p.text}</span></div>`
              )
              .join("")}
          </div>
        </details>
      `
    )
    .join("");

  app.innerHTML = `
    <h1 class="section-title">Constitution</h1>
    <p class="helper-note">The living rulebook: Yahoo's current settings, every ratified rule change since 2017, and what's still being decided. Ratified rules are folded into the articles below; anything still in play is in "On the docket." The full year-by-year vote record is at the bottom for reference.</p>

    ${articlesHTML}

    <h2 class="section-title">On the docket for 2026</h2>
    <p class="helper-note" style="margin-bottom:8px;">Open items the league needs to formally resolve this cycle — not yet part of the ratified rules above.</p>
    ${docketHTML}

    <h2 class="section-title">Full proposal archive</h2>
    <p class="helper-note" style="margin-bottom:8px;">Every proposal on record, 2017-2025, color-coded by outcome. Tap a season to expand.</p>
    ${archiveHTML}
  `;
}

// ---------- Free agents ----------
function renderFreeAgents() {
  app.innerHTML = `
    <h1 class="section-title">Free agents</h1>
    <p class="helper-note">Example data for layout only - live production stats plug in once the nflverse sync is wired up.</p>
    <div class="card" style="padding:0;overflow:hidden;">
      <div class="fa-header">
        <span>Player</span><span>Snap%</span><span>Usage</span><span>Air yds</span><span>Prior $</span>
      </div>
      <div id="fa-rows"></div>
    </div>
  `;
  const rows = document.getElementById("fa-rows");
  FREE_AGENTS.forEach((p) => {
    const row = document.createElement("div");
    row.className = "fa-row";
    row.innerHTML = `
      <span><span style="font-weight:500;">${p.name}</span> <span style="color:var(--navy-mid);font-size:11px;">${p.pos} &middot; ${p.team}</span></span>
      <span>${p.snap > 0 ? p.snap + "%" : "&mdash;"}</span>
      <span>${p.usage}</span>
      <span>${p.airYards > 0 ? p.airYards : "&mdash;"}</span>
      <span>$${p.priorSalary}</span>
    `;
    rows.appendChild(row);
  });
}

// ---------- Schedule ----------
// Circle-method round robin for 12 teams -> 11 unique rounds of 6 games.
// Weeks past 11 wrap around (placeholder until the real post-draft
// schedule is generated).
function roundRobinRounds(teams) {
  const n = teams.length;
  const rounds = [];
  const arr = teams.slice(1);
  for (let r = 0; r < n - 1; r++) {
    const round = [[teams[0], arr[arr.length - 1]]];
    for (let i = 0; i < arr.length / 2 - 0.5; i++) {
      if (i * 2 + 1 < arr.length - 1) {
        round.push([arr[i * 2], arr[i * 2 + 1]]);
      }
    }
    // simpler pairing fallback for even split
    rounds.push(round);
    arr.unshift(arr.pop());
  }
  return rounds;
}

function buildSchedule() {
  const teamNames = OWNERS.map((o) => o.team2025);
  const n = teamNames.length;
  const fixed = teamNames[0];
  const rotating = teamNames.slice(1);
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [[fixed, rotating[rotating.length - 1]]];
    for (let i = 0; i < (n - 2) / 2; i++) {
      pairs.push([rotating[i], rotating[n - 3 - i]]);
    }
    rounds.push(pairs);
    rotating.unshift(rotating.pop());
  }
  return rounds; // 11 rounds x 6 games
}

let currentWeek = 1;

function renderSchedule() {
  const rounds = buildSchedule();
  app.innerHTML = `
    <h1 class="section-title">Schedule</h1>
    <div class="week-chips" id="week-chips"></div>
    <div id="matchups"></div>
  `;
  const chipsEl = document.getElementById("week-chips");
  for (let w = 1; w <= 17; w++) {
    const chip = document.createElement("div");
    chip.className = "week-chip" + (w === currentWeek ? " active" : "");
    chip.textContent = "Wk " + w;
    chip.onclick = () => {
      currentWeek = w;
      renderSchedule();
    };
    chipsEl.appendChild(chip);
  }

  const round = rounds[(currentWeek - 1) % rounds.length];
  const box = document.getElementById("matchups");
  if (currentWeek > rounds.length) {
    const note = document.createElement("div");
    note.className = "helper-note";
    note.style.marginBottom = "8px";
    note.textContent = "Rotation repeats past week " + rounds.length + " - placeholder until the real post-draft schedule generates.";
    box.appendChild(note);
  }
  round.forEach((pair, i) => {
    const row = document.createElement("div");
    row.className = "matchup-row";
    row.innerHTML = `
      <span class="team-a">${pair[0]}</span>
      <span class="slot">${TIME_SLOTS[i]}</span>
      <span class="team-b">${pair[1]}</span>
    `;
    box.appendChild(row);
  });
}

// ---------- Trades ----------
function renderTrades() {
  const otherOwners = OWNERS.filter((o) => o.slug !== "mike-bertha");
  app.innerHTML = `
    <h1 class="section-title">Propose a trade</h1>
    <div class="trade-columns">
      <div class="trade-side">
        <div class="helper-note" style="margin-bottom:4px;">Team gives</div>
        <select style="width:100%;margin-bottom:8px;"><option>JBLA (you)</option></select>
        <div class="helper-note" style="margin:8px 0 4px;">Assets sent</div>
        <div id="assets-sent"></div>
        <button class="add-btn"><i class="ti ti-plus" aria-hidden="true"></i> Add player</button>
        <button class="add-btn"><i class="ti ti-currency-dollar" aria-hidden="true" style="color:var(--green);"></i> Add budget (max $30)</button>
      </div>
      <div class="trade-side">
        <div class="helper-note" style="margin-bottom:4px;">Team receives from</div>
        <select id="counterparty" style="width:100%;margin-bottom:8px;">
          <option value="">Select owner&hellip;</option>
          ${otherOwners.map((o) => `<option value="${o.slug}">${o.name}</option>`).join("")}
        </select>
        <div class="helper-note" style="margin:8px 0 4px;">Assets received</div>
        <div id="assets-received">&mdash;</div>
        <button class="add-btn"><i class="ti ti-plus" aria-hidden="true"></i> Add player</button>
        <button class="add-btn"><i class="ti ti-currency-dollar" aria-hidden="true" style="color:var(--green);"></i> Add budget (max $30)</button>
      </div>
    </div>
    <textarea placeholder="Optional note to the league" style="width:100%;min-height:56px;margin:12px 0;padding:8px;border-radius:8px;border:0.5px solid var(--navy-light);"></textarea>
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <div class="helper-note"><i class="ti ti-info-circle" aria-hidden="true"></i> Reviewed by commissioner &middot; 1-day reject window</div>
      <button class="submit-btn" id="submit-trade">Submit for review</button>
    </div>
    <p class="helper-note" style="margin-top:16px;">This form isn't wired to storage yet - there's no backend running. It's here so the layout and rules (asset types, $30 budget cap, review workflow) are locked in before that gets built.</p>
  `;
  document.getElementById("submit-trade").onclick = () => {
    alert("Trade submission isn't connected to a backend yet - this button is a placeholder for the real flow.");
  };
}

// ---------- Router ----------
function bindNavClicks() {
  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.onclick = () => {
      window.location.hash = "#/" + el.getAttribute("data-nav");
    };
  });
}

function route() {
  const hash = window.location.hash.replace(/^#\//, "") || "season";
  const parts = hash.split("/");
  setActiveNav(parts[0]);
  if (parts[0] === "season" || parts[0] === "") renderSeason();
  else if (parts[0] === "history") renderHistory();
  else if (parts[0] === "owners" && parts[1]) renderOwnerProfile(parts[1]);
  else if (parts[0] === "owners") renderOwnersList();
  else if (parts[0] === "free-agents") renderFreeAgents();
  else if (parts[0] === "schedule") renderSchedule();
  else if (parts[0] === "trades") renderTrades();
  else if (parts[0] === "constitution") renderConstitution();
  else renderSeason();
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", () => {
  route();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
});
