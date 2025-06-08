const players = [];
const historyGraph = {}; // { 'Alice-Bob': 1, ... }
const maxTerrains = 7;
let pendingPlayers = [];
let currentMatches = [];

function addPlayer() {
  const name = document.getElementById('playerName').value.trim();
  if (name && !players.some(p => p.name === name)) {
    players.push({ name, wins: 0, losses: 0 });
    updatePlayerList();
  }
  document.getElementById('playerName').value = '';
}

function updatePlayerList() {
  const list = document.getElementById('playerList');
  list.innerHTML = '';

  // On trie les joueurs : victoires décroissantes, défaites croissantes
  players.sort((a, b) => b.wins - a.wins || a.losses - b.losses);

  let rank = 1;
  let previous = null;
  let displayRank = 1;

  // Utilisation d'une liste ordonnée pour le classement
  const ol = document.createElement('ol');
  ol.className = "content";

  players.forEach((player, index) => {
    // Gérer les égalités au niveau du classement
    if (
      previous &&
      player.wins === previous.wins &&
      player.losses === previous.losses
    ) {
      // même rang
    } else {
      displayRank = rank;
    }

    // Choix de la médaille
    let medal = '';
    if (displayRank === 1) medal = '🥇 ';
    else if (displayRank === 2) medal = '🥈 ';
    else if (displayRank === 3) medal = '🥉 ';

    const totalMatches = player.wins + player.losses;

    // Élément joueur stylisé Bulma
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${medal}${player.name}</strong> 
      <span class="tag is-primary is-light" style="margin-left: 0.5em;">
        V: ${player.wins}
      </span>
      <span class="tag is-danger is-light" style="margin-left: 0.3em;">
        D: ${player.losses}
      </span>
      <span class="tag is-info is-light" style="margin-left: 0.3em;">
        M: ${totalMatches}
      </span>
    `;

    ol.appendChild(li);
    previous = player;
    rank++;
  });

  list.appendChild(ol);
}

function generateMatches() {
  document.getElementById('generateBtn').disabled = true;
  const matchList = document.getElementById('matchList');
  matchList.innerHTML = '';

  const available = [...players];
  const matches = [];

  available.sort((a, b) => totalMatchesPlayed(a.name) - totalMatchesPlayed(b.name));

  while (available.length >= 4 && matches.length < maxTerrains) {
    const team1 = findBestPair(available);
    removePlayers(available, team1);
    const team2 = findBestPair(available);
    if (!team2) break;
    removePlayers(available, team2);

    matches.push([team1, team2]);
    incrementHistory(team1);
    incrementHistory(team2);
  }

  currentMatches = matches.map(([[p1, p2], [p3, p4]], i) => ({
    id: i,
    players: [p1, p2, p3, p4],
    teams: [[p1, p2], [p3, p4]],
    resolved: false
  }));

  currentMatches.forEach((match, i) => {
    const [p1, p2] = match.teams[0];
    const [p3, p4] = match.teams[1];

    // Card Bulma pour chaque match
    const card = document.createElement('div');
    card.className = 'card mb-4';
    card.id = `match-${match.id}`;

    card.innerHTML = `
  <header class="card-header is-flex is-justify-content-space-between is-align-items-center" style="gap: 1rem;">
    <p class="card-header-title" style="flex-grow: 1;">
      Terrain ${i + 1} :
    </p>
    <p class="card-header-title" style="flex-grow: 2; text-align: right;">
      <strong>${p1.name}</strong> &amp; <strong>${p2.name}</strong>
    </p>
    <p class="card-header-title" style="flex-grow: 1; text-align: center;">
      VS
    </p>
    <p class="card-header-title" style="flex-grow: 2; text-align: left;">
      <strong>${p3.name}</strong> &amp; <strong>${p4.name}</strong>
    </p>
  </header>
  <footer class="card-footer">
    <a href="#" class="card-footer-item button is-success is-light" id="winTeam1-${match.id}">Victoire : ${p1.name} & ${p2.name}</a>
    <a href="#" class="card-footer-item button is-link is-light" id="winTeam2-${match.id}">Victoire : ${p3.name} & ${p4.name}</a>
  </footer>
`;


    matchList.appendChild(card);

    document.getElementById(`winTeam1-${match.id}`).addEventListener('click', e => {
      e.preventDefault();
      finishMatch(match.id, match.teams[0], match.teams[1]);
    });

    document.getElementById(`winTeam2-${match.id}`).addEventListener('click', e => {
      e.preventDefault();
      finishMatch(match.id, match.teams[1], match.teams[0]);
    });
  });

  pendingPlayers = available;
  updateWaitingList();
}

function finishMatch(matchId, winners, losers) {
  winners.forEach(p => p.wins++);
  losers.forEach(p => p.losses++);
  updatePlayerList();

  const card = document.getElementById(`match-${matchId}`);
  const buttons = card.querySelectorAll('a.card-footer-item');
  buttons.forEach(btn => {
    btn.classList.add('is-static');
    btn.removeEventListener('click', () => {});
    btn.disabled = true;
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.6';
  });

  const match = currentMatches.find(m => m.id === matchId);
  match.resolved = true;

  if (currentMatches.every(m => m.resolved)) {
    document.getElementById('generateBtn').disabled = false;
  }
}

function updateWaitingList() {
  const matchList = document.getElementById('matchList');

  // Supprime ancienne liste attente si existante
  const oldWaitDiv = document.getElementById('waitingPlayersDiv');
  if (oldWaitDiv) oldWaitDiv.remove();

  if (pendingPlayers.length === 0) return;

  const div = document.createElement('div');
  div.id = 'waitingPlayersDiv';
  div.className = 'notification is-warning mt-4';
  div.innerHTML = `<strong>Joueurs en attente :</strong> ${pendingPlayers.map(p => p.name).join(', ')}`;

  matchList.appendChild(div);
}

function findBestPair(playersPool) {
  let bestPair = null;
  let minPlayed = Infinity;

  for (let i = 0; i < playersPool.length; i++) {
    for (let j = i + 1; j < playersPool.length; j++) {
      const p1 = playersPool[i];
      const p2 = playersPool[j];
      const key = getPairKey(p1.name, p2.name);
      const played = historyGraph[key] || 0;
      if (played < minPlayed) {
        minPlayed = played;
        bestPair = [p1, p2];
      }
    }
  }
  return bestPair;
}

function removePlayers(pool, pair) {
  pair.forEach(p => {
    const index = pool.indexOf(p);
    if (index !== -1) pool.splice(index, 1);
  });
}

function incrementHistory(pair) {
  const key = getPairKey(pair[0].name, pair[1].name);
  historyGraph[key] = (historyGraph[key] || 0) + 1;
}

function getPairKey(a, b) {
  return [a, b].sort().join('-');
}

function totalMatchesPlayed(playerName) {
  let count = 0;
  for (const key in historyGraph) {
    if (key.includes(playerName)) count += historyGraph[key];
  }
  return count;
}

function loadTestPlayers() {
  const testNames = [
    "Alice", "Bob", "Charlie", "Diane", "Émile", "Fatima",
    "Georges", "Hugo", "Isabelle", "Jean", "Khadija", "Luc",
    "Marc", "Nina", "Omar", "Paul", "Quentin", "Rania",
    "Sophie", "Thomas", "Ugo", "Valérie", "Wassim", "Xavier",
    "Yasmine", "Zoé"
  ];
  testNames.forEach(name => {
    if (!players.some(p => p.name === name)) {
      players.push({ name, wins: 0, losses: 0 });
    }
  });
  updatePlayerList();
}

function exportRanking() {
  // Trier les joueurs comme dans updatePlayerList
  const sortedPlayers = [...players].sort((a, b) => b.wins - a.wins || a.losses - b.losses);

  // Préparer l’objet exportable (nom, victoires, défaites, total matchs)
  const exportData = sortedPlayers.map(player => ({
    name: player.name,
    wins: player.wins,
    losses: player.losses,
    totalMatches: player.wins + player.losses
  }));

  // Convertir en JSON formaté
  const jsonString = JSON.stringify(exportData, null, 2);

  // Création d’un Blob et lien de téléchargement
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Création et clic sur un lien invisible pour télécharger
  const a = document.createElement('a');
  a.href = url;
  a.download = 'classement_badminton_nuit.json';
  document.body.appendChild(a);
  a.click();

  // Nettoyage
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);

  alert('Le classement a bien été exporté en JSON');
}
