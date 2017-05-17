var TwitterPackage = require('twit');
var fs = require('fs');

// importing my json files
var secret = require("./secret");
var config = require("./config");

//make a new Twitter object
var Twitter = new TwitterPackage(secret);

// global vars
var post_list = new Array;
var ignore_list = new Array;
var friend_list = new Array;
var ignore_list_path = './ignorelist';
var ignore_keywords = config['ignore_keywords'];
var friend_list_path = './friendlist';
var ratelimit= [999,999,100];
var ratelimit_search= [999,999,100];
var ratelimit_follows= [15,15,100];
var checkRateLimitInterval;
var updateRetweetInterval;
var scanContestsInterval;

// load in the ignore list
if (fs.existsSync(ignore_list_path)) {
	console.log('loading ignore list');
	var ignore_list_str = fs.readFileSync(ignore_list_path, 'utf8');
	ignore_list = ignore_list_str.split();
    //console.log('ignore list: ' + ignore_list);
} else {
	console.log('creating an ignore list');
	fs.closeSync(fs.openSync(ignore_list_path, 'w'));
	var text = 'dummylisting\nlistings\n';
	fs.appendFile(ignore_list_path, text, function (err) {
        if (err) return console.log(err);
    });
}

// load in the friend list
if (fs.existsSync(friend_list_path)) {
	console.log('loading friend list');
	var friend_list_str = fs.readFileSync(ignore_list_path, 'utf8');
	friend_list = friend_list_str.split();
    //console.log('ignore list: ' + ignore_list);
} else {
	console.log('creating an friend list');
	fs.closeSync(fs.openSync(friend_list_path, 'w'));
	var text = 'dummylisting\n';
	fs.appendFile(friend_list_path, text, function (err) {
        if (err) return console.log(err);
    });
}
// Check rate limits - and quit the app if we're about to get blocked
function checkRateLimit (){
	console.log("Checking rate limits");
	checkRateLimitInterval = setTimeout(checkRateLimit, config['rate_limit_update_time']*1000);

	if (ratelimit[2] < config['min_ratelimit']){
		console.log("Ratelimit too low -> Cooldown (" + str(ratelimit[2]) + "%)")
		clearTimeout(checkRateLimitInterval);
		checkRateLimitInterval = setTimeout(checkRateLimit, 30000);
	} else {
		Twitter.get('application/rate_limit_status', function(err, data, response) {
  			for (var res_families in data['resources']){
  				for(var res in data['resources'][res_families]){
  					var limit = data['resources'][res_families][res]['limit'];
					var remaining = data['resources'][res_families][res]['remaining'];
					var percent = remaining/limit*100;

					if (res == "/search/tweets"){
						ratelimit_search=[limit,remaining,percent]
					}

					if (res == "/application/rate_limit_status"){
						ratelimit=[limit,remaining,percent]
  					}

					if (res == "/friendships/outgoing"){
						ratelimit_follows=[limit,remaining,percent]
  					}

  					if (percent < 7.0){
  						// made this 7% for the follows list (15 follows in 15 minutes -> 1/15 is 6.67%)
						console.log(res_families + " -> " + res + ": " + percent + "  !!! <7% Emergency exit !!!" + " Remaingin -> " + remaining);				
						process.exit(res_families + " -> " + res + ": " + percent + "  !!! <7% Emergency exit !!!" + " Remaingin -> " + remaining);
					} else if (percent < 30.0){
						console.log(res_families + " -> " + res + ": " + percent + "  !!! <30% alert !!!" + " Remaining -> " + remaining);				
					} else if (percent < 70.0){
						console.log(res_families + " -> " + res + ": " + percent);
					}
				}
  			}
  			if(err){
  				console.log(err);
  			}
		});
	}
}

// Update the Retweet queue (this prevents too many retweets happening at once.)
function UpdateQueue(){
	updateRetweetInterval = setTimeout(UpdateQueue, config['retweet_update_time']*1000);

	console.log("=== CHECKING RETWEET QUEUE ===");
	console.log("Queue length: " + post_list.length);

	if (post_list.length > 0){
		if (ratelimit[2] >= config['min_ratelimit_retweet']){

			var tweet = post_list[0];
			
			var tweet_id;
	
			if(tweet.hasOwnProperty('retweeted_status')){
				tweet_id = tweet['retweeted_status']['id_str'];
			} else if (tweet['in_reply_to_status_id_str'] != null) {
				console.log("Replied status: " + tweet['text']);
				console.log("Replied status id: " + tweet['id_str']);
				console.log("Replied reply status id: " + tweet['in_reply_to_user_id_str']);
				tweet_id = tweet['in_reply_to_status_id_str'];
			} else {
				tweet_id = tweet['id_str'];
			}
		
			Twitter.post('statuses/retweet/:id', { id: tweet_id }, function (err, data, response) {
				if(err){
					console.log(err);
					console.log("------ Failed tweet: " + tweet_id + " : " + tweet['id_str'] + " : " + tweet['text']);
				} else {
					console.log("------ Retweeting: " + tweet_id + " " + tweet['text']);
					CheckForFavoriteRequest(tweet);
					CheckForFollowRequest(tweet);
				}
			});

			post_list.shift();

		} else {
				console.log("Ratelimit at " + ratelimit[2] + "% -> pausing retweets")
		}
	}
}

// Check if a post requires you to follow the user.
// Be careful with this function! Twitter may write ban your application for following too aggressively
function CheckForFollowRequest(item){
	var tweet;
	if(item.hasOwnProperty('retweeted_status')){
		tweet = item['retweeted_status'];
	} else {
		tweet = item;
	}
	var text = tweet['text'];
	var userToFollow = tweet['user']['screen_name'];
	var userMentions = tweet['entities']['user_mentions'];

	var userArray = [];

	userArray.push(userToFollow);

	for (let user of userMentions){
		if (user['screen_name'] !== userToFollow) userArray.push(user['screen_name']);
	}

	var toFollow = false;

	for(let follow_keyword of config['follow_keywords']){
		if (text.toLowerCase().indexOf(follow_keyword) >= 0) toFollow = true;
	}

	if(toFollow){
		console.log("Follow text: " + text);
		console.log("Follow mentions: " + userMentions);
		console.log("Follow userArray: " + userArray);
		console.log(ratelimit_follows[1] + " : " + userArray.length);
		if(ratelimit_follows[1] >= userArray.length){
			for (let screen_name of userArray){
				Twitter.post('friendships/create', {'screen_name': screen_name}, function(err, data, response){
					if(err){
						console.log("Follow error: " + err);
						console.log(screen_name);
					} else {
						console.log("Follow: " + screen_name);
						//addToFriendList(screen_name);
					}
				});					
			}

		} else {
			console.log("-> follow limit reached");
		}
	} 
}

// Check if a post requires you to favorite the tweet.
// Be careful with this function! Twitter may write ban your application for favoriting too aggressively
function CheckForFavoriteRequest(item){
	var text = item['text'];
	for(let faveKeyWord of config['fav_keywords']){
		if (text.toLowerCase().indexOf(faveKeyWord) >= 0){
			console.log('>>>>> need to like it');
			try {
				Twitter.post('favorites/create', {'id': item['retweeted_status']['id_str']}, function(err, data, response){
					if(err){
						console.log("Favorite error: " + err);
					} else {
						console.log("Favorite: " + item['retweeted_status']['id_str']);
					}
				});
			}
			catch(err) {
				Twitter.post('favorites/create', {'id': item['id_str']}, function(err, data, response){
					if(err){
						console.log("Favorite error: " + err);
					} else {
						console.log("Favorite: " + item['id']);
					}
				});
			}
		}
	}
}


// Scan for new contests, but not too often because of the rate limit.
function ScanForContests(){	
	scanContestsInterval = setTimeout(ScanForContests, config['scan_update_time']*1000);

	if (ratelimit_search[2] >= config['min_ratelimit_search']){

		for (var search_query of config['search_queries']){
			Twitter.get('search/tweets', {'q':search_query, 'result_type':'recent', 'count':100, 'lang': 'en'}, function(err, data, response) {
				if (err) console.log("Search error: " + err);
				
				for(var tweet of data.statuses){
					var tweet_id = tweet['id_str'];
			  		var original_id;
			  		var screen_name = tweet['user']['screen_name'];

					if(tweet.hasOwnProperty('retweeted_status')){
			  			original_id = tweet['retweeted_status']['id_str'];
			  		} else if (tweet['in_reply_to_status_id_str'] != null) {
			  			original_id = tweet['in_reply_to_status_id_str'];
			  		}
					
					if(ignore_list.indexOf(tweet_id) < 0 && ignore_list.indexOf(original_id) < 0 && ignore_list.indexOf(screen_name) < 0) {
						var no_ignore_keyword = true;
						for (let ignore_keyword of ignore_keywords){
							if(tweet['text'].toLowerCase().indexOf(ignore_keywords[0]) >= 0) no_ignore_keyword = false;
						}
						if (no_ignore_keyword){
							post_list.push(tweet);
				  			addToIgnoreList(tweet_id);
				  			addToIgnoreList(original_id);
				  			addToIgnoreList(screen_name);
			  			}
			  		} 
				}
				
			});
		}

	}
}

// Add tweet to the ignore list and write to file
function addToIgnoreList(tweet_id){
	ignore_list.push(tweet_id);
	var text = tweet_id + '\n';
	fs.appendFile(ignore_list_path, text, function (err) {
        if (err) return console.log(err);
    });
}

// keep list of people following managable
function addToFriendList(screen_name){
	friend_list.push(screen_name);
	if(friend_list.length>3000){
		var df = friend_list.length - 3000;
		for(var i=0; i<df; i++){
			Twitter.post('friendships/destroy', {'screen_name': friend_list[0]}, function(err, data, response){
				if(err) {
					console.log("friendship destroy error: " + err);
				} else {
					console.log("friendship destroyed: " + friend_list[0]);
					friend_list.shift();
				}
			});
		}
	}
	var friend_list_str = friend_list.join();
	friend_list_str.replaceAll(',','\n');
	fs.truncate(friend_list_path, 0, function() {
    fs.writeFile(friend_list_path, friend_list_str, function (err) {
        if (err) {
            console.log("Error writing friend_list file: " + err);
        } else {
        	console.log("Written a new friend_list file. Length -> " + friend_list.length);
        }
    });
});
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

checkRateLimit();
ScanForContests();
UpdateQueue();