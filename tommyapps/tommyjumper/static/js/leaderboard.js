
/**
 * Simple client-side leaderboard viewer using localStorage as fallback.
 * If a /api/scores endpoint exists, you can fetch and render server scores too.
 */

function refreshLeaderboard() {
  // If there is a table with id="leaderboardTable", populate it from localStorage
  const table = document.getElementById('leaderboardTable');
  // If the template doesn't define a dynamic table, do nothing instead of reloading endlessly
  if (!table) { return; }

  const key = 'tommyjumper_local_scores';
  const rows = JSON.parse(localStorage.getItem(key) || '[]')
    .sort((a,b) => b.score - a.score)
    .slice(0, 20);

  // wipe old rows (keep header)
  while (table.rows.length > 1) table.deleteRow(1);
  rows.forEach((r, i) => {
    const tr = document.createElement('tr');
    const rank = document.createElement('td'); rank.textContent = (i+1).toString();
    const name = document.createElement('td'); name.textContent = r.name || 'Player';
    const score = document.createElement('td'); score.textContent = r.score.toString();
    const time = document.createElement('td'); time.textContent = new Date(r.ts).toLocaleString();
    tr.append(rank, name, score, time);
    table.appendChild(tr);
  });
}

window.addEventListener('load', refreshLeaderboard);
