After a chat in the office we thought it'd be funny to create a Twitter bot that searched for 'Retweet to Win' and then retweet them. So I did. This is the bot. It's built in Javascript to run on JodeJS.

Although I won gig tickets, movie tickets, a gym membership, albums and books - it turns out I was beaten to it by about 18 months by this guy, [Hunter Scott](http://www.hscott.net/twitter-contest-winning-as-a-service/). And he was far more successful.

The bot is based [Conna Wiles bot](https://github.com/kurozael) built in Python. To make it you'll need to create a Twitter app and a Twitter Dev account. Here's a quick breakdown of how to do that:

### Creating a Twitter App
You will need a registered Twitter account. Although I included it as a requirement at the top of this page, this is the part where you will need it. _Before you can continue, make sure you have a Twitter account!_

If you have *not* added your phone number to your Twitter account, [add one here before continuing](https://twitter.com/settings/add_phone).

#### Naming your App
After logging into your account on its website, proceed to https://apps.twitter.com. This is where you will register your app, get your API information, and control how your application works.

![apps.twitter.com](https://videlais.files.wordpress.com/2014/12/twitter_newapp.png)

Click on the “Create New App” button to start the process of creating a new app and registering it with Twitter.

![create an application](https://videlais.files.wordpress.com/2014/12/twitter_createapp.png)

For each required field, “Name”, “Description” and “Website”, make sure you fill out the information. You can fill these out with dummy values now and change them later:
* Name: "TwitterbotDemo" (for example)
* Description: "A simple bot" (for example)
* Website: "https://google.com" (for example)

Note, too, that the “Name” will be how this application is known to other services. While you can using something simple like "TwitterbotDemo" for this example, it might be worthwhile to find a name you like and is not already in use for more advanced projects.

![](https://videlais.files.wordpress.com/2014/12/twitter_agree.png)

Before you can finalize creating a Twitter application, you must agree to the Developer Agreement.


Take the time right now to read through it and become aware of how Twitter expects an application to act and what rights you have as a developer through this agreement. If you want to, of course.


Once done, click on “Create your Twitter application”.

![](https://videlais.files.wordpress.com/2014/12/twitter_appscreen.png?w=620)

With your application now created, you can change the default permissions from “Read-only” (the application can only read your tweets) to “Read and Write” (the application can read and write tweets).

#### Changing Permissions
To do that, click on the “Permissions” tab.

![](https://videlais.files.wordpress.com/2014/12/twitter_permissions.png?w=620)


From the choices, select “Read and Write” and then click on the “Update Settings” button.

Now that the permissions have been changed and your application will be allowed write tweets in the future.

Now we need to find the API key information and create an access token. This means that we will be grabbing and creating some unique tokens that will be used to identify our app. Think of this as the "username and passwords of applications". Since they are basically passwords... Don't share them with anyone!

Let's proceed. Click on the “Keys and Access Tokens” tab.

![](https://videlais.files.wordpress.com/2014/12/twitter_customerscret.png?w=620)

There are 4 tokens we will need:
1. API Key
2. API Secret
3. Access Token
4. Access Token Secret

The first two, Twitter generates for us. However, it doesn't automatically create an Access Token for your application. To do that, scroll down the page to find that section.

![](https://videlais.files.wordpress.com/2014/12/twitter_accesstoken.png?w=620)

To generate an Access Token at your current permission levels (“Read and Write”) for your application, click on the “Create my access token” button.

![](https://videlais.files.wordpress.com/2014/12/twitter_accesstokengranted1.png)

Once generated, you should now have a Consumer Key, Consumer Secret, Access Token, and Access Token Secret. All four will be needed to use the basic Twitter bot successfully.