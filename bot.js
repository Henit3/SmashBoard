const eris = require('eris');
const fs = require('fs');
const PREFIX = '!';
const BOT_OWNER_ID = '291679678819860481';
const bot = new eris.Client(process.env.BOT_TOKEN);
const commandForName = {};

var userData = JSON.parse(fs.readFileSync('userData.json', 'utf8'));
var winRequests = new Set(); // Contains (winner, loser) until expiry or confirmation
var killRequests = {};
var DMchannel;

/*
Record current ranking (shared ranking requires same win/loss and score)
Calculate new score, win/loss and ranking

So both cases must be checked for any ties
For any ties previously, leave them untouched
When moving up, increment all passed by 1
When moving down, decrement all passed by 1
*/
function changeData(id, id2, hasWon) {
	const oldRank = userData[id].rank;
	// Increment played for both, won for the winner
	userData[id].played++;
	if (hasWon) {
		userData[id].won++;
	}
	// Calculate the new score and win/loss
	var score;
	var diff = 0;
	if (hasWon) {
		diff = Math.max(0.2*userData[id2].score, 5)
		score = userData[id].score + diff;
	} else {
		score = Math.max(userData[id].score - id2, 0);
	}	
	userData[id].score = score;
	const winLoss = userData[id].won / (userData[id].played - userData[id].won);
	userData[id].winLoss = winLoss;
	var oldSharedRank = 0; // Count number of players sharing rank
	for (var i_id in userData) {
		if (i_id == id) continue;
		const player = userData[i_id];
		if (player.rank == oldRank) {oldSharedRank += 1;}
	}	
	var rank = oldRank;
	var newSharedRank = false;
	console.log("Before scores:\n");
	console.log(userData);
	// Dependant on score first then winLoss
	// Check all scores and take the ranking of the one just below it
	
	// Starting from shared pos, up means push rest down, down means potentially get next lower - 1
	// If oldSharedRank not 0, score > (oldRank + oldSharedRank + 1).score and score < oldRank.score, then rank = oldRank + oldSharedRank
	if (!hasWon && oldSharedRank != 0 && oldRank + oldSharedRank + 1 > Object.keys(userData).length) { // If no rank below shared, make it
		rank = oldRank + oldSharedRank; // Custom
	} else {
		for (var i_id in userData) {
			if (i_id == id) continue;
			const player = userData[i_id];
			if (!hasWon && oldSharedRank != 0) {
				if (oldRank + oldSharedRank + 1 == player.rank) { // Check if its the rank below to compare scores
					if (player.score > score) {
						rank = player.rank - 1; // Custom
						break;
					} else if (player.score == score) { // Check Win/Loss
						if (winLoss > player.winLoss) { // If the win/loss is better
							rank = player.rank - 1; // Custom
							break;
						} else if (winLoss == player.winLoss) { // If the win/loss is the same
							// This rank will be shared so quit
							rank = player.rank;
							newSharedRank = true;
							break;
						}
					}
				}
			}
			if (score > player.score && rank > player.rank) { // If bigger score and higher rank
				rank = player.rank; // Take its rank (leave pushing it down for separate loop)
			} else if (score == player.score) { // If an equal score has been found
				if (winLoss > player.winLoss) { // If the win/loss is better
					rank = player.rank; // Take its rank
				} else if (winLoss == player.winLoss) { // If the win/loss is the same
					// This rank will be shared so quit
					rank = player.rank;
					newSharedRank = true;
					break;
				} // Nothing happens if its less
			} // Nothing happens if its less or of a lower rank
		}
	}
	userData[id].rank = rank;
	// Rank is now finalized, begin to shift the rest of them
	for (var i_id in userData) {
		if (i_id == id) continue;
		const player = userData[i_id];
		console.log(oldRank + " - " + player.rank + " - " + rank);
		console.log(oldSharedRank + " / " + newSharedRank);
		if (hasWon) {
			// If strictly between old and new ranks or if not sharing the rank and is equal or if used to share rank, then increment
			if ((player.rank > oldRank && rank >= player.rank) || (!newSharedRank && rank == player.rank) || (oldSharedRank != 0 && player.rank == oldRank)) {
				player.rank += 1; // this won't always work like if we overtake 7 where there's 444, then we would be 7??????
			}
		} else {
			// If strictly between old and new ranks or if not sharing the rank and is equal, then decrement
			if ((player.rank < oldRank && rank <= player.rank) || (!newSharedRank && rank == player.rank)) {
				player.rank -= 1;
			}
		}
	}
	console.log("After scores:\n");
	console.log(userData);
	return diff;
	// Could instead check scores + winLoss at the end and order everything
}

function initPlayer(id) {
	if (!userData[id]) {
		var rank = Object.keys(userData).length+1;
		for (var i_id in userData) {
			const player = userData[i_id];
			if (player.played == 0) {
				rank = player.rank;
			}
		}
		userData[id] = {
			played: 0,
			won: 0,
			score: 0,
			winLoss: 0,
			rank: rank
		}
	}	
}

function nullToInfinity() {
	for (var i_id in userData) {
		const player = userData[i_id];
		if (player.winLoss == null) {
			player.winLoss = Infinity;
		}
	}		
}

function padText(input, chars) {
	const space = chars - String(input).length;
	var out = input;
	for (var i = 0; i < space; i++) out += " ";
	return out;
}	

function saveString(msg) {
	console.log(DMchannel + "\n" + JSON.stringify(userData));
	bot.createMessage(DMchannel.id, JSON.stringify(userData));
}
async function getDMchannel() {
	DMchannel = await bot.getDMChannel(BOT_OWNER_ID);
}	

// !win winner loser
//  Opens win query for 60s before expiry
commandForName['win'] = {
   execute: (msg, args) => {
	   // Make sure that there are two users
	   if (args.length != 2) {
		   return msg.channel.createMessage('Use format "!win <Winner> <Loser>"');
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
		   if (w_userId == pair[0] || l_userId == pair[0] || w_userId == pair[1] || l_userId == pair[1]) {
			   return msg.channel.createMessage('One of the players is already involved in a win request!');
		   }   
	   }
	   // Store the person that should be confirming for the confirm command
	   const pair = [w_userId, l_userId];
	   winRequests.add(pair);
	   
	   // Create a timer to reply within
	   const timeToLive = 60;
	   killRequests[pair] = setTimeout( function(){winRequests.delete(pair);
	       msg.channel.createMessage(`Confirmation request expired, please try "!win" again ${w_mention}`);} , timeToLive*1000);
		   
       return Promise.all([
           msg.channel.createMessage(`${l_mention} please confirm you lost to ${w_mention} by submitting "!confirm" within 60 seconds.`)
       ]);
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
			   initPlayer(pair[0]);
			   initPlayer(pair[1]);
			   // Adjust the scores for both players
			   var diff = changeData(pair[0], pair[1], true);
			   diff = changeData(pair[1], diff, false);
			   
			   return msg.channel.createMessage(`Confirmed ${w_name} won against ${l_name}.`);
		   }
	   }
	   return msg.channel.createMessage('I dunno what you are on about?');
   },
};

// !info [user]
//  Return stats for the user including:
//  Played, Win, Loss, Win/Loss, Score (100*Win/Played+3)
commandForName['info'] = {
   execute: (msg, args) => {
	   var user;
	   if (args.length == 0) { // Checking info of self
	       user = msg.channel.guild.members.get(msg.author.id);
		   // If the user involved doesn't have previous records, instantiate them
		   initPlayer(msg.author.id);
	   } else if (args.length == 1) { // Checking another person's info
	       // Make sure the players are in the server
		   const id = args[0].replace(/<@!?(.*?)>/, (match, group1) => group1);
		   const userIsInGuild = msg.channel.guild.members.get(id);
           if (!userIsInGuild) {
               return msg.channel.createMessage('This user was not found in this guild.');
           }
		   // If the user involved doesn't have previous records, instantiate them
		   initPlayer(id);
		   user = msg.channel.guild.members.get(id);
	   } else {
		   return msg.channel.createMessage('Use format "!info [Player]"');
	   }
	   //console.log(user);
	   const embed = {
		   "title": "Stats",
		   "description": "Played: " + userData[user.id].played + ", Won: " + userData[user.id].won + ", Win/Loss: " + userData[user.id].winLoss
		   + "\nScore: " + (Math.round(userData[user.id].score * 100) / 100) + ", Ranking: " + userData[user.id].rank,
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
   },
};

// !leaderboard
//  Return info for all players, sorted by score
commandForName['leaderboard'] = commandForName['lb'] = {
   execute: (msg, args) => {
	   // Sort out people with their ranks
	   var atRank = {};
	   var players = Object.keys(userData).length;
	   for (var i_id in userData) {
		   var pos = userData[i_id].rank*players;
		   while (!!atRank[pos]) pos += 1;
		   atRank[pos] = i_id;
	   }
	   console.log("Ranks:\n");
	   console.log(atRank);
	   var output = "**Leaderboard:**\n```" +
					"┌──────┬──────────────────────┬────────┬───────┬───────┬──────────┬───────┐\n" +
					"│ Rank │ Name                 │ Played │ Won   │ Lost  │ Win/Loss │ Score │\n" + 
					"├──────┼──────────────────────┼────────┼───────┼───────┼──────────┼───────┤\n";
	   for (var rankNo in atRank) {
		    const i_id = atRank[rankNo];
			const player = userData[i_id];
			const user = msg.channel.guild.members.get(i_id);
			const name = !!user.nick?user.nick:user.username;
			output += "│ " + padText(player.rank, 4) + " │ " + padText(name, 20) + " │ " + padText(player.played, 6) + " │ " +
						padText(player.won, 5) + " │ " + padText((player.played-player.won), 5) + " │ " +
						padText(Math.round(userData[user.id].winLoss * 100) / 100, 8) +	" │ " + padText(Math.round(userData[user.id].score * 10) / 10, 5) + " │\n";
	   }
	   output += "└──────┴──────────────────────┴────────┴───────┴───────┴──────────┴───────┘```";
	   msg.channel.createMessage(output);
   },
};

// !debug
//  For debug data only
commandForName['debug'] = {
   execute: (msg, args) => {   
	   console.log(userData);
   },
};

// !wipeData
//  Wipes all user data
commandForName['wipeData'] = {
   execute: (msg, args) => {   
	   userData = {};
	   return msg.channel.createMessage('Congratulations, I guess?');
   },
};

// !save
//  Saves all user data into a JSON file
commandForName['save'] = {
   execute: (msg, args) => {
       fs.writeFile('userData.json', JSON.stringify(userData), (err) => {
		   if (err) {
			   throw err;
			   return msg.channel.createMessage('User data failed to save!');
		   }
	   });
	   saveString(msg);
	   return msg.channel.createMessage('User data successfully saved.');
   },
};

// !load
//  Load all user data from a JSON string
commandForName['load'] = {
   botOwnerOnly: true,
   execute: (msg, args) => {
       userData = JSON.parse(args[0]);
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
			   "name": "!win <Winner> <Loser>",
			   "value": "Use this command to declare to the bot that you destroyed someone's soul. " +
			   "This will start a 60 second timer where the loser must accept defeat by using the '!confirm'" +
			   "command to tell the bot about their failure."
			   },
			   {
			   "name": "!confirm",
			   "value": "Used by the loser to let the bot know the win query started with the '!win' command " +
			   "isn't bogus and that the win should be recored for eternal shame."
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
      if (!msg.channel.guild) {
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
	nullToInfinity();
	bot.editStatus("dnd", {name: "with stats! Use !help or !?", type: 0}); 
	console.log('Up and running!')
	}
);

bot.on('error', err => {
 console.warn(err);
});

bot.connect();

/* TODO:

*/