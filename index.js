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
var ignore_list_path = './ignorelist';
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
    console.log('ignore list: ' + ignore_list);
} else {
	console.log('creating an ignore list');
	fs.closeSync(fs.openSync(ignore_list_path, 'w'));
	var text = 'dummy\nlistings\n';
	fs.appendFile(ignore_list_path, text, function (err) {
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
  			console.log("Got rate limits")
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
						console.log(res_families + " -> " + res + ": " + percent + "  !!! <7% Emergency exit !!!");				
						process.exit(res_families + " -> " + res + ": " + percent + "  !!! <7% Emergency exit !!!");
					} else if (percent < 30.0){
						console.log(res_families + " -> " + res + ": " + percent + "  !!! <30% alert !!!");				
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

			var post = post_list[0];

			if( CheckForFollowRequest(post)){

				CheckForFavoriteRequest(post);
		
				var tweet_id;
		
				if(post.hasOwnProperty('retweeted_status')){
					tweet_id = post['retweeted_status']['id_str'];
				} else {
					tweet_id = post['id_str'];
				}
			
				Twitter.post('statuses/retweet/:id', { id: tweet_id }, function (err, data, response) {
					if(err){
						console.log(err);
					} else {
						console.log("------ Retweeting: " + tweet_id + " " + post['text']);
					}
				});
				post_list.shift();

			} else {

				post_list.shift();
				clearTimeout(updateRetweetInterval);
				UpdateQueue();
			}
			
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
		if (user !== userToFollow) userArray.push(user);
	}

	for(let follow_keyword of config['follow_keywords']){

		if (text.toLowerCase().indexOf(follow_keyword) >= 0){

			console.log("follow required");

			if(ratelimit_follows[1] >= userArray.length){

				for (let screen_name of userArray){
					Twitter.post('friendships/create', {'screen_name': screen_name}, function(err, data, response){
						if(err){
							console.log(err);
							return false;
						} else {
							console.log("Follow: " + screen_name);
							return true;
						}
					});					
				}
			} else {
				console.log("- but follow limit reached");
				return false;
			}
		} else {
			console.log("follow not required");
			return true;
		}

	}
}

// Check if a post requires you to favorite the tweet.
// Be careful with this function! Twitter may write ban your application for favoriting too aggressively
function CheckForFavoriteRequest(item){
	var text = item['text'];
	for(let faveKeyWord of config['fav_keywords']){
		if (text.toLowerCase().indexOf(faveKeyWord) >= 0){
			try {
				Twitter.post('favorites/create', {'id': item['retweeted_status']['id']}, function(err, data, response){
					if(err){
						console.log(err);
					} else {
						console.log("Favorite: " + item['retweeted_status']['id']);
					}
				});
			}
			catch(err) {
				Twitter.post('favorites/create', {'id': item['id']}, function(err, data, response){
					if(err){
						console.log(err);
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
	var stream = Twitter.stream('statuses/filter', {track: config['search_queries']});
	
	stream.on('tweet', function (tweet) {
		//console.log("New tweet: " + tweet['text']);
  		//console.log(tweet);
  		
  		var tweet_id;
  		
  		if(tweet.hasOwnProperty('retweeted_status')){
  			//console.log("-- It's a retweet");
  			tweet_id = tweet['retweeted_status']['id'];
  		} else {
  			//console.log("-- New tweet!");
  			tweet_id = tweet['id'];
  		}
  		
  		if(ignore_list.indexOf(tweet_id) < 0){
			//console.log("New tweet: " + tweet['text']);
  			//console.log("--- Adding to the list");
  			post_list.push(tweet);
  			if(post_list.length > 200){
  				stream.stop();
  				setTimeout(stream.start, 600000);
  			}
  			addToIgnoreList(tweet_id);
  		} else {
  			//console.log("Ignored!");
  		}
	});

	// ... when we get an error...
	stream.on('error', function(error) {
    	console.log(error);    
	});
	
	
	
}

// Add tweet to the ignore list and write to file
function addToIgnoreList(tweet_id){
	ignore_list.push(tweet_id);
	var text = tweet_id + '\n';
	fs.appendFile(ignore_list_path, text, function (err) {
        if (err) return console.log(err);
    });
}

checkRateLimit();
ScanForContests();
UpdateQueue();