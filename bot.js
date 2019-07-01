const eris = require('eris');
const fs = require('fs');
const pg = require('pg');

const icon_emoji = {};
icon_emoji['bayo'] = icon_emoji['bayonetta'] = '<:bayonetta:593406233789071380>';
icon_emoji['bowser'] = '<:bowser:593406235034779698>';
icon_emoji['bowser_jr'] = '<:bowser_jr:593406236062646292>';
icon_emoji['chrom'] = '<:chrom:593406238885150721>';
icon_emoji['cloud'] = '<:cloud:593406240005029889>';
icon_emoji['kamui'] = icon_emoji['corrin'] = '<:corrin:593406243071066154>';
icon_emoji['daisy'] = '<:daisy:593406242689646614>';
icon_emoji['dark_pit'] = '<:dark_pit:593406282493329413>';
icon_emoji['dark_samus'] = '<:dark_samus:593406287216377866>';
icon_emoji['king_dedede'] = icon_emoji['dedede'] = '<:dedede:593406268631285770>';
icon_emoji['ddk'] = icon_emoji['diddy_kong'] = '<:diddy_kong:593406532717248562>';
icon_emoji['dk'] = icon_emoji['donkey_kong'] = '<:donkey_kong:593406533006786572>';
icon_emoji['doc'] = icon_emoji['dr_mario'] = '<:dr_mario:593406534784909313>';
icon_emoji['duck_hunt'] = '<:duck_hunt:593406536580202506>';
icon_emoji['faclo'] = '<:falco:593406537586704395>';
icon_emoji['falcon'] = icon_emoji['captain_falcon'] = '<:falcon:593406238016929825>';
icon_emoji['fox'] = '<:fox:593406538287415306>';
icon_emoji['doriyah'] = icon_emoji['ganon'] = icon_emoji['ganondorf'] = '<:ganondorf:593406291406225428>';
icon_emoji['dat_boi'] = icon_emoji['greninja'] = '<:greninja:593406290269831169>';
icon_emoji['game&watch'] = icon_emoji['game_and_watch'] = icon_emoji['gw'] = '<:gw:593406265552797709>';
icon_emoji['icies'] = icon_emoji['ic'] = icon_emoji['ice_climbers'] = '<:ice_climbers:593406276269113344>';
icon_emoji['ike'] = '<:ike:593406293163638784>';
icon_emoji['incineroar'] = '<:incineroar:593406293939585025>';
icon_emoji['inkling'] = '<:inkling:593406293503377428>';
icon_emoji['isabelle'] = '<:isabelle:593406558898094093>';
icon_emoji['puff'] = icon_emoji['jigglypuff'] = '<:jigglypuff:593406284120719377>';
icon_emoji['arsene'] = icon_emoji['joker'] = '<:joker:593406287832940544>';
icon_emoji['ken'] = '<:ken:593406296510693396>';
icon_emoji['king_k_rool'] = icon_emoji['k_rool'] = '<:k_rool:593406539440586763>';
icon_emoji['poyo'] = icon_emoji['kirby'] = '<:kirby:593406539683987465>';
icon_emoji['link'] = '<:link:593406541391200266>';
icon_emoji['little_mac'] = icon_emoji['mac'] = '<:little_mac:593406543022522378>';
icon_emoji['lucario'] = '<:lucario:593406559405604864>';
icon_emoji['lucas'] = '<:lucas:593406554179633171>';
icon_emoji['lucina'] = '<:lucina:593406293696315415>';
icon_emoji['luigi'] = '<:luigi:593406290760564746>';
icon_emoji['mario'] = '<:mario:593406295441408010>';
icon_emoji['marth'] = '<:marth:593406292530429954>';
icon_emoji['mega_man'] = '<:mega_man:593406285345456138>';
icon_emoji['mk'] = icon_emoji['meta_knight'] = '<:meta_knight:593406274306310172>';
icon_emoji['mew2'] = icon_emoji['mewtwo'] = '<:mewtwo:593406277963743265>';
icon_emoji['mii'] = '<:mii:593406290596855809>';
icon_emoji['ness'] = '<:ness:593406282535534641>';
icon_emoji['olimar'] = '<:olimar:593406560265568267>';
icon_emoji['pac'] = icon_emoji['pac_man'] = '<:pac_man:593406546759647232>';
icon_emoji['palu'] = icon_emoji['palutena'] = '<:palutena:593406562526298112>';
icon_emoji['peach'] = '<:peach:593406561314144266>';
icon_emoji['pichu'] = '<:pichu:593406558109564949>';
icon_emoji['plant'] = icon_emoji['pirahna_plant'] = '<:pirahna_plant:593406558432395289>';
icon_emoji['pikachu'] = '<:pikachu:593406270304944138>';
icon_emoji['pit'] = '<:pit:593406295244275713>';
icon_emoji['pkmn_trainer'] = icon_emoji['pokemon_trainer'] = '<:pokemon_trainer:593406290827542529>';
icon_emoji['richter'] = '<:richter:593406292916437022>';
icon_emoji['ridley'] = '<:ridley:593406282287808513>';
icon_emoji['rob'] = '<:rob:593406286117208102>';
icon_emoji['robin'] = '<:robin:593406291070812199>';
icon_emoji['rosalina_and_luma'] = icon_emoji['rosa'] = icon_emoji['rosalina'] = '<:rosalina:593406290907365377>';
icon_emoji['roy'] = '<:roy:593406294203826176>';
icon_emoji['ryu'] = '<:ryu:593406296162697226>';
icon_emoji['samus'] = '<:samus:593406560483672088>';
icon_emoji['zelda2'] = icon_emoji['sheik'] = '<:sheik:593406560110379034>';
icon_emoji['shulk'] = '<:shulk:593406561507082241>';
icon_emoji['simon'] = '<:simon:593406561460944907>';
icon_emoji['there'] = icon_emoji['snake'] = '<:snake:593406560915685387>';
icon_emoji['sonic'] = '<:sonic:593406286452883457>';
icon_emoji['toon_link'] = '<:toon_link:593406290177294356>';
icon_emoji['killager'] = icon_emoji['villager'] = '<:villager:593406286641627136>';
icon_emoji['wario'] = '<:wario:593406295961501698>';
icon_emoji['wii_fit_trainer'] = icon_emoji['wii_fit'] = '<:wii_fit:593406276642537472>';
icon_emoji['wolf'] = '<:wolf:593406292035371018>';
icon_emoji['yoshi'] = '<:yoshi:593406269025419264>';
icon_emoji['young_link'] = '<:young_link:593406295042818065>';
icon_emoji['zelda'] = '<:zelda:593406295533420554>';
icon_emoji['zero_suit'] = icon_emoji['zero_suit_samus'] = icon_emoji['zss'] = '<:zss:593406295021846529>';

const PREFIX = '!';
const bot = new eris.Client(process.env.BOT_TOKEN);
const commandForName = {};

const client = new pg.Client(process.env.DATABASE_URL);
client.connect();

var winRequests = new Set(); // Contains (winner, loser) until expiry or confirmation
var killRequests = {}; // Contains mappings to functions that kill winRequests, clearRequests or removing reactions
var clearRequest; // Contains number of messages to be cleared or null

// MISC FUNCTIONS:
function padText(input, chars) {
	const space = chars - String(input).length;
	var out = input;
	for (var i = 0; i < space; i++) out += " ";
	return out;
}	

function saveString(msg, data) { // Data previously stringified into JSON
	bot.getDMChannel(process.env.BOT_OWNER_ID)
	.then(DMchannel => {
		//console.log(DMchannel + "\n" + data);
		bot.createMessage(DMchannel.id, data);
	})
	.catch(e => console.error(e.stack))
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
			setScore(score);
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
			//console.log(player);
			// Use getRank to get rank
			getRank(id, msg.channel.guild.id)
			.then(rank => {
				//console.log(rank);
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
			//console.log(ranked);
			var output =	"**Leaderboard:**\n```" +
							"┌────────────────────────────────┬────────┬──────┬──────┬──────────┬───────┐\n" +
							"│ Name                           │ Played │ Won  │ Lost │ Win/Loss │ Score │\n" + 
							"├────────────────────────────────┼────────┼──────┼──────┼──────────┼───────┤\n";
			//console.log(ranked.length);			
			for (var i = 0; i < ranked.length; i++) {
				const player = ranked[i];
				//console.log(player);
				const user = msg.channel.guild.members.get(player.user);
				//console.log(user);
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
	botOwnerOnly: true,
	execute: (msg, args) => {
		return msg.channel.createMessage("No more bugs in this server; you're welcome! " + "<:sheeba:588660686096171012>");
	},
};

// !react <Character>
//  Responds with corresponding smash icon
commandForName['react'] = {
	execute: (msg, args) => {
		if (args.length != 1) { // Checking info of self
			return msg.channel.createMessage('Use format "!react <Character>"');
		}
		msg.channel.getMessages(2)
		.then(messages => {
			const emoji = icon_emoji[args[0]].substring(2,icon_emoji[args[0]].length-1);
			//console.log(messages[1])
			messages[1].addReaction(emoji)
			.then(res => {
				msg.delete();
				// Create a timer to delete after
				const timeToLive = 10;
				killRequests[messages[1].id+emoji] = setTimeout( function(){
					messages[1].removeReaction(emoji)
					.catch(e => console.error(e.stack))
					} , timeToLive*1000);
			})
			.catch(e => console.error(e.stack))
		})
		.catch(e => console.error(e.stack))
	},
};

// !emote <Message with !character>
//  Responds with smash icons edited in
commandForName['emote'] = {
	execute: (msg, args) => {
		if (args.length == 0) { // Checking info of self
			return msg.channel.createMessage('Use format "!emote <Message with !character>"');
		}
		user = msg.channel.guild.members.get(msg.author.id);
		var found = false;
		var message = msg.content;
		//console.log(message);
		for (key in icon_emoji) {
			if (message.toLowerCase().includes(PREFIX+key.toLowerCase())) {
				const pattern = new RegExp(PREFIX+key, 'gi');
				found = true;
				message = message.replace(pattern, icon_emoji[key]);
			}
		}
		//console.log(message);
		if (found) {
			msg.delete()
			.then(msg.channel.createMessage((!!user.nick?user.nick:user.username) + ": " + message.substring(7)))
			.catch(e => console.error(e.stack));
		} else {
			return msg.channel.createMessage("No smashers there");
		}
	},
};

// !clear <Messages>
//  Clears out the number of messages specified
commandForName['clear'] = {
	execute: (msg, args) => {
		if (args.length != 1) {
			if (killRequests[-1] != null) {
				msg.channel.purge(clearRequest+3)
				.then(clearRequest = null)
				.catch(e => console.error(e.stack));
				clearTimeout(killRequests[-1]);
				return;
			} else {
				return msg.channel.createMessage('Use format "!clear <Messages>"');
			}
		}
		if (isNaN(args[0])) return msg.channel.createMessage("Enter a number for the limit");
		const toClear = parseInt(args[0])+1;
		if (toClear > 10) {
			if (clearRequest != null) {
				clearRequest += 2;
				return msg.channel.createMessage("At least wait until the current clear request is handled or expired!");
			}
			// Create a timer to reply within
			clearRequest = toClear-1;
			const timeToLive = 60;
			killRequests[-1] = setTimeout( function(){
				clearRequest = null;
				msg.channel.createMessage('Confirmation request expired, use !clear <messages> to try delete again');
				} , timeToLive*1000);
			msg.channel.createMessage("Wow, that's a lot of messages to delete. Please use !clear on it's own to confirm you're sure");
		} else {
			msg.channel.purge(toClear)
			.catch(e => console.error(e.stack));
		}
	},
};

// !wipeData
//  Wipes all user data
commandForName['wipeData'] = {
	botOwnerOnly: true,
	execute: (msg, args) => {   
		erase(msg.channel.guild.id);
		return msg.channel.createMessage('Congratulations, I guess?');
	},
};

// !save
//  Saves all user data into a JSON string
commandForName['save'] = {
	execute: (msg, args) => {
		getAll(msg.channel.guild.id)
		.then(players => {
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
		if (args.length == 0) return msg.channel.createMessage('Gimme something to work with here Jerry!');
		erase(msg.channel.guild.id); // Wipe existing data
		msg.delete()
		.then(res => {
			playerData = JSON.parse(args[0]);
			for (let player of playerData) {
				if (player.winloss == null) player.winloss = Infinity;
				setScore(player);
			}
			return msg.channel.createMessage('User data successfully loaded.');
		})
		.catch(e => console.error(e.stack))
	},
};

// !help
//  TO ADD: !clear, !react, !emote
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
				"name": "!react <Character>",
				"value": "Makes the bot react to the previous message with a smash character of your choice for 10 seconds; use " +
				"this as an opportunity to react with it yourself! If the character name doesn't work for you, tell my owner."
				},
				{
				"name": "!emote <Message with !character>",
				"value": "Gets you your favourite smash character icons like !react but you can use them in a message as !character " +
				"to tell the bot to insert the icon there. Get creative and smash the competition with your messages!"
				},
				{
				"name": "!clear <Messages>",
				"value": "Made a mistake? Nobody needs to know! Simply enter the number of messages you want the bot to discreetly " +
				"take down and it'll do the dirty work for you. Note that it'll get suspicious for numbers larger than 10 so you'll " +
				"have to confirm with !clear after the inital request - only one of these clear requests can be done at a time."
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
		if (!msg.channel.guild) { // If a DM, ignore
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
		const authorIsBotOwner = msg.author.id === process.env.BOT_OWNER_ID;
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
	tablePrep();
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