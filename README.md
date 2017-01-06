# Dumbledore
A Slack Bot called Dumbledore that lets your team join houses and award house points.

## Installation 
clone this reposity to the machine you want to run the server on.
If you do not have node `>= 6.3.0` and npm installed on your machine install
in the dumbledore directory run:

```bash
$ npm install 
```

## Running Dumbledore

To run the Dumbledore you must have an [API token](#getting-the-api-token-for-your-slack-channel) to authenticate the bot on your slack channel. Once you get it (instructions on the next paragraph) you just have to run:


```bash
BOT_API_KEY=somesecretkey node bin/bot.js
```


## Getting the API token for your Slack channel

To allow the Dumbledore to connect your Slack channel you must provide him an API key. To retrieve it you need to add a new Bot in your Slack organization by visiting the following url: https://*yourorganization*.slack.com/services/new/bot, where *yourorganization* must be substituted with the name of your organization (e.g. https://*loige*.slack.com/services/new/bot). Ensure you are logged to your Slack organization in your browser and you have the admin rights to add a new bot.

You will find your API key under the field API Token, copy it in a safe place and get ready to use it.


## Configuration

Dumbledore is configurable through environment variables. There are several variable available:

| Environment variable | Description |
|----------------------|-------------|
| `BOT_API_KEY` | this variable is mandatory and must be used to specify the API token needed by the bot to connect to your Slack organization |
| `BOT_DB_PATH` | optional variable that allows you to use a different database or to move the default one to a different path |
| `BOT_NAME` | the name of your bot, it’s optional and it will default to dumbledore |
| `BOT_GITHUB_CHANNEL_ID` | the channel id for your teams github tracker(optional) |


## Making Dumbledore
This bot was based off the work of lmammino and the norrisbot project. I created most of the bot in a few days, but this is still an early version and I recognize the code could be much inproved.

## License

Licensed under [MIT License](LICENSE). © Benjamin Campbell.
