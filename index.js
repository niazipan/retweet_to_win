var TwitterPackage = require('twit');

// importing my secret.json file
var secret = require("./secret");

console.log(secret);

var config = require("./config");

console.log(config);


//make a new Twitter object
var Twitter = new TwitterPackage(secret);

// Call the stream function and pass in 'statuses/filter', our filter object, and our callback
//Twitter.stream('statuses/filter', {track: config['search-queries'], filter: 'verified'}, function(stream) {
//var stream = Twitter.stream('statuses/filter', {track: 'twitter'});
var stream = Twitter.stream('statuses/filter', {track: config['search-queries'], filter: 'verified'});


stream.on('tweet', function (tweet) {
  console.log(tweet)
})

// ... when we get an error...
stream.on('error', function(error) {
    console.log(error);    
});
