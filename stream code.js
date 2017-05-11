/*
	var stream = Twitter.stream('statuses/filter', {track: config['search_queries']});
	
	stream.on('tweet', function (tweet) {
		console.log("New tweet: " + tweet['text']);
  		//console.log(tweet);
  		
  		var tweet_id;
  		
  		if(tweet.hasOwnProperty('retweeted_status')){
  			console.log("It's a retweet");
  			tweet_id = tweet['retweeted_status']['id'];
  		} else {
  			console.log("It's a new tweet!");
  			tweet_id = tweet['id'];
  		}
  		
  		if(ignore_list.indexOf(tweet_id) < 0){
  			console.log("Not on the ignore_list");
  			post_list.push(tweet);
  			addToIgnoreList(tweet_id);
  			//console.log(post_list);
  		} else {
  			console.log("Ignored!");
  		}
	});

	// ... when we get an error...
	stream.on('error', function(error) {
    	console.log(error);    
	});*/
	
	
	scanContestsInterval = setTimeout(ScanForContests, config['scan_update_time']);
	
	if (ratelimit_search[2] >= config['min_ratelimit_search']){
	
		for (var search_query of config['search_queries']){
			Twitter.get('search/tweets', {'q':search_query, 'result_type':'recent', 'count':100}, function(err, data, response) {
				if (err) console.log("error: " + err);
				
				//console.log("data 0 id : " + data.statuses[0]['id']);
				
				
				for(var tweetToParse of data.statuses){
					console.log(tweetToParse['text']);
					var tweet_id;
		
					/*if(tweet.hasOwnProperty('retweeted_status')){
						console.log('retweet');
						tweet_id = tweet.retweeted_status.id;
					} else {
						console.log('not a retweet');
						tweet_id = tweet.id;
					}
					
					console.log("tweet id: " + tweet_id);
		
					if(ignore_list.indexOf(tweet_id) < 0){
						console.log('added to the list');
						console.log(tweet);
						post_list.push(tweet);
						addToIgnoreList(tweet_id);
					}*/
				}
				
			});
		}
	}