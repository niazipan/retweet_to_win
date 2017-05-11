var TwitterPackage = require('twit');

// importing my json files
var secret = require("./secret");
var config = require("./config");

//make a new Twitter object
var Twitter = new TwitterPackage(secret);

Twitter.get('search/tweets', {'q': config['search_queries'][1], 'result_type':'recent', 'count':10,'lang' : 'en'}, function(err, data, response) {
	if (err) console.log("error: " + err);
	console.log("================================= : " + encodeURI('RT + F'));
	for(var tweet of data.statuses){
		console.log(tweet['text']);
	}
});


/*
scanContestsInterval = setTimeout(ScanForContests, config['scan_update_time']);

if (ratelimit_search[2] >= config['min_ratelimit_search']){

	for (var search_query of config['search_queries']){
		Twitter.get('search/tweets', {'q':search_query, 'result_type':'recent', 'count':10}, function(err, data, response) {
			if (err) console.log("error: " + err);
			
			for(var tweet of data.statuses){
				console.log(tweet['text']);
				var tweet_id = tweet['id_str'];
		  		var original_id;
		  		var screen_name = tweet['user']['screen_name'];
		  		var original_name;

				if(tweet.hasOwnProperty('retweeted_status')){
		  			//console.log("-- It's a retweet");
		  			original_id = tweet['retweeted_status']['id_str'];
		  			original_name = tweet['retweeted_status']['user']['screen_name'];
		  		}
				
				if(ignore_list.indexOf(tweet_id) < 0 && ignore_list.indexOf(original_id) < 0 && ignore_list.indexOf(screen_name) < 0 && ignore_list.indexOf(original_name)) {
					//console.log("New tweet: " + tweet['text']);
		  			//console.log("--- Adding to the list");
		  			post_list.push(tweet);
		  			if(post_list.length > 200){
		  				clearTimeout(scanContestsInterval);
		  				setTimeout(ScanForContests, 600000);
		  			}
		  			addToIgnoreList(tweet_id);
		  			addToIgnoreList(original_id);
		  			addToIgnoreList(screen_name);
		  			addToIgnoreList(original_name);
		  		} 
			}
			
		});
	}

}
*/