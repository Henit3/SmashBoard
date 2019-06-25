const eris = require('eris');
const fs = require('fs');
const pg = require('pg');

//const SQLite = require("better-sqlite3");
//const sql = new SQLite('./players.sqlite');

const PREFIX = '!';
const BOT_OWNER_ID = '291679678819860481';
const bot = new eris.Client("NTg4ODEwMTQyOTkzMDg4NTUx.XQKiaw.FP-IeWDIAIhLQxHrXUrAEdICsGQ");
const commandForName = {};

const client = new pg.Client({
	user: 'postgres',
	database: 'testing',
	password: 'password',
});
client.connect();

var winRequests = new Set(); // Contains (winner, loser) until expiry or confirmation
var killRequests = {};
var DMchannel;

// MISC FUNCTIONS:
function padText(input, chars) {
	const space = chars - String(input).length;
	var out = input;
	for (var i = 0; i < space; i++) out += " ";
	return out;
}	

function saveString(msg, data) { // Data previously stringified into JSON
	console.log(DMchannel + "\n" + data);
	bot.createMessage(DMchannel.id, data);
}
async function getDMchannel() {
	DMchannel = await bot.getDMChannel(BOT_OWNER_ID);
}

// MAIN FUNCTIONAL CODE:
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
		const winloss = player.won / (player.played - player.won);
		player.winloss = winloss;
		setScore(player);
		return diff;
	})
	.catch(e => console.error(e.stack))
}

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
				winloss: 0,
			}
			setScore.run(score);
		}
	})
	.catch(e => console.error(e.stack))
}

// POSTGRESQL QUERY MANAGEMENT HELPERS:
function erase(guildID) {
	client.query('DELETE FROM players WHERE guild = $1;', [guildID])
	.then(res => console.log("Wiped data for this guild"))
	.catch(e => console.error(e.stack))
}
function setScore(data) {
	client.query('INSERT INTO players (id, "user", guild, played, won, score, winloss) VALUES ($1, $2, $3, $4, $5, $6, $7)'
		+ 'ON CONFLICT (id) DO UPDATE SET played = $4, won= $5, score = $6, winloss = $7;',
		[data.id, data.user, data.guild, data.played, data.won, data.score, data.winloss])
	.then(res => console.log("Updated player data in table"))
	.catch(e => console.error(e.stack))
}

// Use .then() nests
async function getAll(guildID) {
	var result = null;
	await (client.query('SELECT * FROM players WHERE guild = $1 ORDER BY score DESC, winloss DESC, played DESC;', [guildID])
		.then(res => {
			result = res.rows;
		})
		.catch(e => console.error(e.stack))
	)
	return result;
}
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

function tablePrep() {
	// Check if table exists
	// If not, make table, with unique index
	const checkQuery = "SELECT count(*) FROM pg_tables WHERE tablename = 'players';";
	const createQuery = 'CREATE TABLE players (id TEXT PRIMARY KEY, "user" TEXT, guild TEXT, played INTEGER, won INTEGER, score FLOAT, winloss FLOAT);';
	const indexQuery = 'CREATE UNIQUE INDEX idx_players_id ON players (id);';
	client.query("SELECT count(*) FROM pg_tables WHERE tablename = 'players';")
	.then(res => {
		if (res.rows[0].count != 1) {
			client.query('CREATE TABLE players (id TEXT PRIMARY KEY, "user" TEXT, guild TEXT, played INTEGER, won INTEGER, score FLOAT, winloss FLOAT);')
			.then(response => console.log("Table players successfully created"))
			.catch(e => console.error(e.stack))
			client.query('CREATE UNIQUE INDEX idx_players_id ON players (id);')
			.then(response => console.log("Table players successfully created"))
			.catch(e => console.error(e.stack))
		}	
	})
	.catch(e => console.error(e.stack))
}

// !win winner loser
//  Opens win query for 60s before expiry
commandForName['win'] = {
	execute: (msg, args) => {
		// Make sure that there are two users
		var isRanked = true;
		if (args.length != 2 && args.length != 3) { // True for not (2 or 3)
			return msg.channel.createMessage('Use format "!win <Winner> <Loser> [friendly|ranked]"');
		}
		// Parse third argument
		if (args.length == 3) {
			if (args[2].trim().toLowerCase() == "friendly") {
				isRanked = false;
			} else if (args[2].trim().toLowerCase() == "ranked") {
				isRanked = true;
			} else {
				return msg.channel.createMessage('Use format "!win <Winner> <Loser> [friendly|ranked]"');
			}
		}
		// Make sure the players aren't the same
		if (args[0] == args[1]) {
			return msg.channel.createMessage('You cannot win against yourself, you can only be played by yourself...');
		}
 
		const w_mention = args[0];
		const l_mention = args[1];
		const guild = msg.channel.guild;
		const w_userId = w_mention.replace(/<@!?(.*?)>/, (match, group1) => group1); // Optional ! for nicknames se
		const l_userId = l_mention.replace(/<@!?(.*?)>/, (match, group1) => group1)

		// Make sure the players are in the server
		const w_userIsInGuild = guild.members.get(w_userId);
		const l_userIsInGuild = guild.members.get(l_userId);
		if (!w_userIsInGuild || !l_userIsInGuild) {
			return msg.channel.createMessage('One or more users not found in this guild.');
		}
		// Make sure players aren't involved in any winRequests already
		for (let pair of winRequests) {
			for (let id of pair) {
				if (id != 2 && (w_userId == id || l_userId == id)) {
					return msg.channel.createMessage('One of the players is already involved in a win request!');
				}
			}   
		}
		// Store the person that should be confirming for the confirm command
		const pair = [w_userId, l_userId, isRanked];
		winRequests.add(pair);
		console.log(pair);

		// Create a timer to reply within
		const timeToLive = 60;
		killRequests[pair] = setTimeout( function(){
			winRequests.delete(pair);
			msg.channel.createMessage(`Confirmation request expired, please try "!win" again ${w_mention}`);
			} , timeToLive*1000);
 
		//return Promise.all([...]);
		msg.channel.createMessage(`${l_mention} please confirm you lost to ${w_mention} by submitting "!confirm" within 60 seconds.`);
	},
};

// !cancel
//  Check if person doing this is in waiting list/set
//  If they are, remove them
commandForName['cancel'] = {
	execute: (msg, args) => {
		for (let pair of winRequests) {
			if (msg.author.id == pair[0] || msg.author.id == pair[1]) { // If the matching pair is found
				clearTimeout(killRequests[pair]); // Remove the deleting thing
				const w_user = msg.channel.guild.members.get(pair[0]);
				const w_name = !!w_user.nick?w_user.nick:w_user.username;
				const l_user = msg.channel.guild.members.get(pair[1]);
				const l_name = !!l_user.nick?l_user.nick:l_user.username;
				winRequests.delete(pair) // Delete it yourself
 
				return msg.channel.createMessage(`Cancelled win request for ${w_name} against ${l_name} in a ` + (pair[2]?"ranked":"friendly") + " match.");
			}
		}
		return msg.channel.createMessage('Yikes calm down, cancel what exactly?');
	},
};

// !confirm
//  Check if person doing this is in waiting list/set
//  Increment winner's wins by 1
//  Increment played by 1
commandForName['confirm'] = {
	execute: (msg, args) => {
		for (let pair of winRequests) {
			if (msg.author.id == pair[1]) { // If the matching pair is found
				clearTimeout(killRequests[pair]); // Remove the deleting thing
				const w_user = msg.channel.guild.members.get(pair[0]);
				const w_name = !!w_user.nick?w_user.nick:w_user.username;
				const l_user = msg.channel.guild.members.get(pair[1]);
				const l_name = !!l_user.nick?l_user.nick:l_user.username;
				winRequests.delete(pair) // Delete it yourself

				// If the users involved don't have previous records, instantiate them
				initPlayer(pair[0], msg.channel.guild.id);
				initPlayer(pair[1], msg.channel.guild.id);
				// Adjust the scores for both players
				var diff = changeData(pair[0], pair[1], true, msg.channel.guild.id, pair[2]);
				diff = changeData(pair[1], diff, false, msg.channel.guild.id, pair[2]);

				return msg.channel.createMessage(`Confirmed ${w_name} won against ${l_name} in a ` + (pair[2]?"ranked":"friendly") + " match.");
			}
		}
		return msg.channel.createMessage('Are you that ~~submissive~~ desperate to lose?');
	},
};

// !info [user]
//  Return stats for the user including:
//  Ranking function to be called here to get individual ranks
commandForName['info'] = {
	execute: (msg, args) => {
		var user; // rename to id, nah need user for the name
		var id = msg.author.id;
		// Just get ID through here
		if (args.length == 0) { // Checking info of self
			user = msg.channel.guild.members.get(msg.author.id); // Very much needed lol
			// If the user involved doesn't have previous records, instantiate them
			initPlayer(msg.author.id, msg.channel.guild.id);
		} else if (args.length == 1) { // Checking another person's info
			// Make sure the players are in the server
			id = args[0].replace(/<@!?(.*?)>/, (match, group1) => group1);
			const userIsInGuild = msg.channel.guild.members.get(id);
			if (!userIsInGuild) {
				return msg.channel.createMessage('This user was not found in this guild.');
			}
			// If the user involved doesn't have previous records, instantiate them
			initPlayer(id, msg.channel.guild.id);
			user = msg.channel.guild.members.get(id);
		} else {
			return msg.channel.createMessage('Use format "!info [Player]"');
		}

		getScore(id, msg.channel.guild.id)
		.then(player => {
			console.log(player);
			// Use getRank to get rank
			getRank(id, msg.channel.guild.id)
			.then(rank => {
				console.log(rank);
				// Create and send embed
				const embed = {
					"title": "Stats",
					"description": "Played: " + player.played + ", Won: " + player.won + ", Win/Loss: " + player.winloss
					+ "\nScore: " + (Math.round(player.score * 100) / 100) + ", Ranking: " + rank,
					"color": 16151068,
					"thumbnail": {
						"url": "https://cdn.discordapp.com/avatars/" + user.id + "/" + user.avatar + ".png"
					},
					"author": {
						"name": (!!user.nick?user.nick:user.username),
						"icon_url": "https://cdn.discordapp.com/avatars/" + user.id + "/" + user.avatar + ".png"
					}
				};
				msg.channel.createMessage({ embed });
			})
			.catch(e => console.error(e.stack))
		})
		.catch(e => console.error(e.stack))
	},
};

// !leaderboard
//  Return info for all players, sorted by score
commandForName['leaderboard'] = commandForName['lb'] = {
	execute: (msg, args) => {
		getAll(msg.channel.guild.id)
		.then(ranked => {
			console.log(ranked);
			var output =	"**Leaderboard:**\n```" +
							"┌────────────────────────────────┬────────┬──────┬──────┬──────────┬───────┐\n" +
							"│ Name                           │ Played │ Won  │ Lost │ Win/Loss │ Score │\n" + 
							"├────────────────────────────────┼────────┼──────┼──────┼──────────┼───────┤\n";
			console.log(ranked.length);			
			for (var i = 0; i < ranked.length; i++) {
				const player = ranked[i];
				console.log(player);
				const user = msg.channel.guild.members.get(player.user);
				console.log(user);
				const name = !!user.nick?user.nick:user.username;
				output += "│ " + padText(name, 30) + " │ " + padText(player.played, 6) + " │ " +
						padText(player.won, 4) + " │ " + padText((player.played-player.won), 4) + " │ " +
						padText(Math.round(player.winloss * 100) / 100, 8) +	" │ " + padText(Math.round(player.score * 10) / 10, 5) + " │\n";
			}
			output += "└────────────────────────────────┴────────┴──────┴──────┴──────────┴───────┘```";
			msg.channel.createMessage(output);
		})
		.catch(e => console.error(e.stack))
	},
};

// !debug
//  For debug data only
commandForName['debug'] = {
	execute: (msg, args) => {
		const members = msg.channel.guild.members;
		for (let member of members) {
			console.log(member[1].user.username + ": " + member[1].user.id);
		}
	},
};

// !wipeData
//  Wipes all user data
commandForName['wipeData'] = {
	execute: (msg, args) => {   
		erase(msg.channel.guild.id);
		return msg.channel.createMessage('Congratulations, I guess?');
	},
};

// !save
//  Saves all user data into a JSON file
commandForName['save'] = {
	execute: (msg, args) => {
		getAll(msg.channel.guild.id)
		.then(players => {
			fs.writeFile('userData.json', JSON.stringify(players), (err) => {
				if (err) {
					throw err;
					return msg.channel.createMessage('User data failed to save!');
				}
			});
			saveString(msg, JSON.stringify(players));
			return msg.channel.createMessage('User data successfully saved.');
		})
		.catch(e => console.error(e.stack))
	},
};

// !load
//  Load all user data from a JSON string
commandForName['load'] = {
	botOwnerOnly: true,
	execute: (msg, args) => {
		erase(msg.channel.guild.id); // Wipe existing data
		playerData = JSON.parse(args[0]);
		for (let player of playerData) {
			if (player.winloss == null) player.winloss = Infinity;
			setScore(player);
		}
		return msg.channel.createMessage('User data successfully loaded.');
	},
};

// !help
//  Returns all commands available to the user
commandForName['help'] = commandForName['?'] = {
	execute: (msg, args) => {
		const embed = {
			"title": "Help Menu",
			"description": "Here's a list of commands with their respective syntax and decriptions:",
			"fields": [
				{
				"name": "!win <Winner> <Loser> [friendly|ranked]",
				"value": "Use this command to declare to the bot that you destroyed someone's soul. " +
				"This will start a 60 second timer where the loser must accept defeat by using the '!confirm'" +
				"command to tell the bot about their failure. The default setting is a ranked match, which can be" +
				"changed by adding 'friendly' as a third argument - this won't affect your scores."
				},
				{
				"name": "!confirm",
				"value": "Used by the loser to let the bot know the win query started with the '!win' command " +
				"isn't bogus and that the win should be recored for eternal shame."
				},
				{
				"name": "!cancel",
				"value": "Use this to retract a win request if you did it on accident or if you're a sore loser and " +
				"just don't like taking the L."
				},
				{
				"name": "!info [Player]",
				"value": "Brings up information about your own stats if used alone, and can be used to view " +
				"(and laugh at) someone else's stats if used with a mention."
				},
				{
				"name": "!leaderboard   `!lb`",
				"value": "Brings up information about everybody's stats at once to view and laugh at others more efficiently."
				},
				{
				"name": "!save",
				"value": "Saves everyone's stats for good into a file, don't worry about this too much."
				},
				{
				"name": "!help   `!?`",
				"value": "How did you even get here? :thinking:"
				}
			]
		};
		msg.channel.createMessage({ embed });
	},
};

// !rps player1 player2
//  Start rps match between 2 players (put them into a list/set)

// !rock, !paper, !scissor
//  Declare move, if second between 2 players (remove from list/set if done), then resolve

bot.on('messageCreate', async (msg) => {
	try {
		const content = msg.content;

		// Ignore any messages sent as direct messages.
		// The bot will only accept commands issued in
		// a guild.
		if (!msg.channel.guild) { // If a DM, maybe put in load and save commands here
			
			return;
		}

		// Ignore any message that doesn't start with the correct prefix.
		if (!content.startsWith(PREFIX)) {
			return;
		}

		// Extract the parts and name of the command
		const parts = content.split(' ').map(s => s.trim()).filter(s => s);
		const commandName = parts[0].substr(PREFIX.length);

		// Get the requested command, if there is one.
		const command = commandForName[commandName];
		if (!command) {
			return;
		}

		// If this command is only for the bot owner, refuse
		// to execute it for any other user.
		const authorIsBotOwner = msg.author.id === BOT_OWNER_ID;
		if (command.botOwnerOnly && !authorIsBotOwner) {
			return await msg.channel.createMessage('Hey, only my owner can issue that command!');
		}

		// Separate the command arguments from the command prefix and name.
		const args = parts.slice(1);

		// Execute the command.
		await command.execute(msg, args);
	} catch (err) {
		console.warn('Error handling message create event');
		console.warn(err);
	}
});

bot.on('ready', () => {
	getDMchannel();
	tablePrep();
	//nullToInfinity();
	bot.editStatus("dnd", {name: "with stats! Use !help or !?", type: 0});
	console.log('Up and running!')
}
);

bot.on('error', err => {
	console.warn(err);
});

bot.connect();

/* TODO:
	Counter for ranked wins per week (restrict scores) TIMER KNOWLEDGE REQUIRED
*/