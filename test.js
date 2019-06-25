const pg = require('pg');

const client = new pg.Client({
	user: 'postgres',
	database: 'testing',
	password: 'password',
});
client.connect();

/*
const Pool = require('pg-pool');
const url = require('url')

const params = url.parse(process.env.DATABASE_URL);
const auth = params.auth.split(':');

const config = {
  user: auth[0],
  password: auth[1],
  host: params.hostname,
  port: params.port,
  database: params.pathname.split('/')[1],
  ssl: true
};

const pool = new Pool(config);

/*
  Transforms, 'progres://DBuser:secret@DBHost:#####/myDB', into
  config = {
    user: 'DBuser',
    password: 'secret',
    host: 'DBHost',
    port: '#####',
    database: 'myDB',
    ssl: true
  }
*/


// Check if table exists
// If not, make table, with unique index
const checkQuery = "SELECT count(*) FROM pg_tables WHERE tablename = 'players';";
const createQuery = 'CREATE TABLE players (id TEXT PRIMARY KEY, "user" TEXT, guild TEXT, played INTEGER, won INTEGER, score FLOAT, winLoss FLOAT);';
const indexQuery = 'CREATE UNIQUE INDEX idx_players_id ON players (id);';
client.query("SELECT count(*) FROM pg_tables WHERE tablename = 'players';")
	.then(res => {
		if (res.rows[0].count != 1) {
			client.query('CREATE TABLE players (id TEXT PRIMARY KEY, "user" TEXT, guild TEXT, played INTEGER, won INTEGER, score FLOAT, winLoss FLOAT);')
			.then(response => console.log("Table players successfully created"))
			.catch(e => console.error(e.stack))
			client.query('CREATE UNIQUE INDEX idx_players_id ON players (id);')
			.then(response => console.log("Table players successfully created"))
			.catch(e => console.error(e.stack))
		}	
	})
	.catch(e => console.error(e.stack))

player = {
	"id":'588490987983208457-291679678819860481',
	"user":'291679678819860481',
	"guild":'588490987983208457',
	"played":8,
	"won":8,
	"score":40,
	"winLoss":Infinity
}
player2 = {
	"id":'588490987983208457-297157725018652673',
	"user":'297157725018652673',
	"guild":'588490987983208457',
	"played":5,
	"won":4,
	"score":20,
	"winLoss":4
}
// Directly editing the queries causes postgresql to misinterpret it, so use params array

function erase(guildID) {
	client.query('DELETE FROM players WHERE guild = $1;', [guildID])
	.then(res => console.log("Wiped data for this guild"))
	.catch(e => console.error(e.stack))
}
// setScore() synonymous to better-sqlite3 query
function setScore(data) {
	client.query('INSERT INTO players (id, "user", guild, played, won, score, winLoss) VALUES ($1, $2, $3, $4, $5, $6, $7)'
		+ 'ON CONFLICT (id) DO UPDATE SET played = $4, won= $5, score = $6, winLoss = $7;',
		[data.id, data.user, data.guild, data.played, data.won, data.score, data.winLoss])
	.then(res => console.log("Updated player data in table"))
	.catch(e => console.error(e.stack))
}
//setScore(player);
//setScore(player2);
erase(player.guild);

// getAll() to use .then() nests
async function getAll(guildID) {
	var result = null;
	await (client.query('SELECT * FROM players WHERE guild = $1 ORDER BY score DESC, winLoss DESC, played DESC;', [guildID])
		.then(res => {
			result = res.rows;
		})
		.catch(e => console.error(e.stack))
	)
	return result;
}
// getScore() to use .then() nests
async function getScore(userID, guildID) {
	var result = null;
	await (client.query('SELECT * FROM players WHERE "user" = $1 AND guild = $2;', [userID, guildID])
		.then(res => {
			result = res.rows[0];
		})
		.catch(e => console.error(e.stack))
	)
	return result;
}
// getRank() to use .then() nests
async function getRank(userID, guildID) {
	var result = null;
	await (client.query('SELECT count(*) + 1 AS rank FROM players WHERE guild = $2 AND score > '
			+ '(SELECT score FROM players WHERE user = $1 AND guild = $2)', [userID, guildID])
		.then(res => {
			result = res.rows[0].rank;
		})
		.catch(e => console.error(e.stack))
	)
	return result;
}
// Must use .then() for all of the "get" query uses
/*
getScore(player.user, player.guild)
.then(response => {
	console.log(response);
})
.catch(e => console.error(e.stack))
getRank(player.user, player.guild)
.then(response => {
	console.log(response);
})
.catch(e => console.error(e.stack))
*/

// CHANGE_DATA
function changeData(userId, temp, hasWon, guildId, isRanked) { // temp value = {run1: id2, run2: scoreGained}
	getScore(userId,guildId)
	.then(player => {
		player.played++;
		if (hasWon) {
			player.won++;
		}
		// Calculate the new score and win/loss
		if (isRanked) {
			var score;
			var diff = 0;
			if (hasWon) {
				diff = Math.max(0.2*player.score, 5)
				score = player.score + diff;
			} else {
				score = Math.max(player.score - temp, 0);
			}
			player.score = score;
		}	
		const winLoss = player.won / (player.played - player.won);
		player.winLoss = winLoss;
		setScore(player);
		return diff;
	})
	.catch(e => console.error(e.stack))
}

// INIT_PLAYER
function initPlayer(userId, guildId) {
	getScore(userId,guildId)
	.then(score => {
		if (!score) {
			score = {
				id: `${guildId}-${userId}`,
				user: userId,
				guild: guildId,
				played: 0,
				won: 0,
				score: 0,
				winLoss: 0,
			}
			setScore.run(score);
		}
	})
	.catch(e => console.error(e.stack))
}

// LEADERBOARD
function leaderboard(msg, args) {
	getAll(player.guild)
	.then(response => {
		console.log(response);
		// for loop through them, and use to build up message to send
	})
	.catch(e => console.error(e.stack))
}		

// INFO
function info(msg, args) {
	//var user;
	var id = msg.author.id;
	// Getting user and ID dependant on the args
	// Use getScore to get player data
	getScore(id, msg.channel.guild.id)
	.then(player => {
		console.log(player);
		// Use getRank to get rank
		getRank(id, msg.channel.guild.id)
			.then(rank => {
				console.log(rank);
				// Create and send embed
		})
		.catch(e => console.error(e.stack))
	})
	.catch(e => console.error(e.stack))
}	



/*
client.query("SELECT NOW()", (err, res) => {
console.log(err, res);
client.end();
});
*/

/*
// TODO: Maybe have a function to see number of people of this rank, and sort them based on winloss, then aggregate
	getRank = sql.prepare("SELECT count(*) + 1 AS rank FROM players WHERE guild = ? AND score > (SELECT score FROM players WHERE user = ? AND guild = ?)"); // Ignores Win/Loss INFO
	getAll = sql.prepare("SELECT * FROM players WHERE guild = ? ORDER BY score DESC, winLoss DESC, played DESC;"); //.all(msg.channel.guild.id) LEADERBOARD
	getScore = sql.prepare("SELECT * FROM players WHERE user = ? AND guild = ?"); INFO CHANGEDATA INITPLAYER
	setScore = sql.prepare("INSERT OR REPLACE INTO players (id, user, guild, played, won, score, winLoss) VALUES (@id, @user, @guild, @played, @won, @score, @winLoss);"); LOAD CHANGEDATA INITPLAYER
	erase = sql.prepare("DELETE FROM players WHERE guild = ?;"); WIPEDATA LOAD
*/