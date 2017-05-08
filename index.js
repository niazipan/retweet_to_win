var TwitterPackage = require('twit');
var fs = require('fs');

// importing my json files
var secret = require("./secret");
var config = require("./config");

//make a new Twitter object
var Twitter = new TwitterPackage(secret);

// global vars
var post_list = [];
var ignore_list = [];
var ratelimit= [999,999,100];
var ratelimit_search= [999,999,100];
var ratelimit_follows= [15,15,100];
var checkRateLimitInterval;
var updateRetweetInterval;

// Check rate limits - and quit the app if we're about to get blocked
function checkRateLimit (){
	console.log("Checking rate limits");
	checkRateLimitInterval = setInterval(checkRateLimit, config['rate_limit_update_time']*1000);

	if (ratelimit[2] < config['min_ratelimit']){
		console.log("Ratelimit too low -> Cooldown (" + str(ratelimit[2]) + "%)")
		clearInterval(checkRateLimitInterval);
		checkRateLimitInterval = setInterval(checkRateLimit, 30000);
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
						console.log(res_family + " -> " + res + ": " + str(percent) + "  !!! <7% Emergency exit !!!");				
						process.exit(res_family + " -> " + res + ": " + str(percent) + "  !!! <7% Emergency exit !!!");
					} else if (percent < 30.0){
						console.log(res_family + " -> " + res + ": " + str(percent) + "  !!! <30% alert !!!");				
					} else if (percent < 70.0){
						console.log(res_family + " -> " + res + ": " + str(percent));
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
	updateRetweetInterval = setInterval(UpdateQueue, config['retweet_update_time']*1000);

	console.log("=== CHECKING RETWEET QUEUE ===");
	console.log("Queue length: " + post_list.length);

	if (post_list.length > 0){
		if (ratelimit[2] >= config['min_ratelimit_retweet']){
			var post = post_list[0];

			if( CheckForFollowRequest(post) == true && ratelimit_follows[1] > 1 ){
				console.log("Retweeting: " + post['id'] + " " + post['text']);
				CreateFollowRequest(post);
				CheckForFavoriteRequest(post);
			
				Twitter.post('statuses/retweet/:id', { id: post['id'] }, function (err, data, response) {
	  				if(err){
	  					console.log(err);
	  				} else {
						post_list.shift();
	  				}
				});
			} else {
				post_list.push(post_list.shift());
			}

		
		} else {
				console.log("Ratelimit at " + ratelimit[2] + "% -> pausing retweets")
		}
	}
}

// Check if a post requires you to follow the user.
// Be careful with this function! Twitter may write ban your application for following too aggressively
function CheckForFollowRequest(item){
	var text = item['text'];
	for(var follow_text in config['follow_keywords']){
		if (text.toLowerCase().indexOf(follow_text) >= 0){
			console.log("follow required");
			return true;
		} else {
			console.log("follow not required");
			return false;
		}
	}
}

function CreateFollowRequest(item){
	try {
		Twitter.post('friendships/create', {'screen_name': item['retweeted_status']['user']['screen_name']}, function(err, data, response){
			if(err){
				console.log(err);
			} else {
				console.log("Follow: " + item['retweeted_status']['user']['screen_name']);
			}
		});
	}
	catch (err){
		Twitter.post('friendships/create', {'screen_name': item['user']['screen_name']}, function(err, data, response){
			if(err){
				console.log(err);
			} else {
				console.log("Follow: " + item['user']['screen_name']);
			}
		});
	}
}

// could create a follow queue <<<<<-------------


// Check if a post requires you to favorite the tweet.
// Be careful with this function! Twitter may write ban your application for favoriting too aggressively
function CheckForFavoriteRequest(item){
	var text = item['text'];
	for(var fav_text in config['fav_keywords']){
		if (text.toLowerCase().indexOf(fav_text) >= 0){
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
	var ScanforContestsInterval = (ScanForContests, config['scan_update_time']*1000);

	var stream = Twitter.stream('statuses/filter', {track: config['search_queries'], filter: 'verified'});

	stream.on('tweet', function (tweet) {
		//console.log("Getting new results for: " + search_query);
  		console.log(tweet);

	});

	// ... when we get an error...
	stream.on('error', function(error) {
    	console.log(error);    
	});
	
}

checkRateLimit();
ScanForContests();
UpdateQueue();

/*
	if (ratelimit_search[2] >= min_ratelimit_search){}
	
		console.log("=== SCANNING FOR NEW CONTESTS ===");

		for (var search_query in config['search_queries']){

			print("Getting new results for: " + search_query)
		
			try{
				r = api.request('search/tweets', {'q':search_query, 'result_type':"mixed", 'count':100})
				CheckError(r)
				c=0
					
				for item in r:
					
					c=c+1
					user_item = item['user']
					screen_name = user_item['screen_name']
					text = item['text']
					text = text.replace("\n","")
					id = str(item['id'])
					original_id=id
					is_retweet = 0

					if 'retweeted_status' in item:

						is_retweet = 1
						original_item = item['retweeted_status']
						original_id = str(original_item['id'])
						original_user_item = original_item['user']
						original_screen_name = original_user_item['screen_name']

					if not original_id in ignore_list:

						if not original_screen_name in ignore_list:
				
							if not screen_name in ignore_list:
	
								if item['retweet_count'] > 0:

									post_list.append(item)
									f_ign = open('ignorelist', 'a')

									if is_retweet:
										print(id + " - " + screen_name + " retweeting " + original_id + " - " + original_screen_name + ": " + text)
										ignore_list.append(original_id)
										f_ign.write(original_id + "\n")
									else:
										print(id + " - " + screen_name + ": " + text)
										ignore_list.append(id)
										f_ign.write(id + "\n")

									f_ign.close()

						else:
			
							if is_retweet:
								print(id + " ignored: " + original_screen_name + " on ignore list")
							else:
								print(original_screen_name + " in ignore list")

					else:
	
						if is_retweet:
							print(id + " ignored: " + original_id + " on ignore list")
						else:
							print(id + " in ignore list")
				
				print("Got " + str(c) + " results")

			except Exception as e:
				print("Could not connect to TwitterAPI - are your credentials correct?")
				print("Exception: " + e)

	else:

		print("Search skipped! Queue: " + str(len(post_list)) + " Ratelimit: " + str(ratelimit_search[1]) + "/" + str(ratelimit_search[0]) + " (" + str(ratelimit_search[2]) + "%)")




checkRateLimit();
/*
// Call the stream function and pass in 'statuses/filter', our filter object.

*/
