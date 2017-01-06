'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');
var random = require("random-js")(); // uses the nativeMath engine

var Dumbledore = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'dumbledore';
    this.dbPath = settings.dbPath || path.resolve(process.cwd(), 'data', 'dumbledore.db');
    this.githubChannel = settings.githubChannel || 'null';

    this.user = null;
    this.db = null;
    this.params = {
      link_names: 1
    };
};

// inherits methods and properties from the Bot constructor
util.inherits(Dumbledore, Bot);

Dumbledore.prototype.run = function () {
    Dumbledore.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};


Dumbledore.prototype._onStart = function () {
    this._loadBotUser();
    this._connectDb();
    this._firstRunCheck();
};

Dumbledore.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
};

Dumbledore.prototype._connectDb = function () {
    if (!fs.existsSync(this.dbPath)) {
        console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
        process.exit(1);
    }

    this.db = new SQLite.Database(this.dbPath);
};

Dumbledore.prototype._firstRunCheck = function () {
    var self = this;
    self.db.get('SELECT val FROM info WHERE name = "lastrun" LIMIT 1', function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
        }

        var currentTime = (new Date()).toJSON();

        // this is a first run
        if (!record) {
            self._welcomeMessage();
            return self.db.run('INSERT INTO info(name, val) VALUES("lastrun", ?)', currentTime);
        }

        // updates with new last running time
        self.db.run('UPDATE info SET val = ? WHERE name = "lastrun"', currentTime);
    });
};

Dumbledore.prototype._welcomeMessage = function () {
    this.postMessageToChannel(this.channels[0].name, 'Welcome to Hogwarts everyone!' +
        '\n Now, in a few moments you will pass through these doors and join your classmates, but before you take your seats, you must be sorted into your houses. They are Gryffindor, Hufflepuff, Ravenclaw, and Slytherin. Now while you\'re here, your house will be like your family. Your triumphs will earn you points. Any rule breaking, and you will lose points. At the end of the year, the house with the most points is awarded the house cup.' + '\n I Albus Dumbledore will award points on your behalf. Just say `10 points to Gryffindor` + or `5 points to @benc` to award points',
        {as_user: true});
};

Dumbledore.prototype._welcomeMessageManual = function (originalMessage, bot) {
  var bot = bot;
  bot._announcePlainString(originalMessage, 'Welcome to Hogwarts everyone!' +
    '\n Now, in a few moments you will pass through these doors and join your classmates, but before you take your seats, you must be sorted into your houses. They are Gryffindor, Hufflepuff, Ravenclaw, and Slytherin. Now while you\'re here, your house will be like your family. Your triumphs will earn you points. Any rule breaking, and you will lose points. At the end of the year, the house with the most points is awarded the house cup.' + '\n I Albus Dumbledore will award points on your behalf. Just say `10 points to Gryffindor` + or `5 points to @benc` to award points', bot);
};

Dumbledore.prototype._onMessage = function (message) {
  if (this._isChatMessage(message) &&
    this._isChannelConversation(message) &&
    !this._isFromDumbledore(message) &&
    !this._isFromSlackbot(message)
  ) {
    if ((message.text.indexOf('01100100 01110101 01101101 01100010 01101100 01100101 01100100 01101111 01110010 01100101') > -1) || (message.text.indexOf('01110000 01101111 01101001 01101110 01110100 01110011 00100000 01110100 01101111') > -1) || (message.text.indexOf('01110000 01101111 01101001 01101110 01110100 01110011 00100000 01100110 01110010 01101111 01101101') > -1)) {
      var binaryArray = message.text.split(" ");
      var decimalArray = binaryArray.map(function(x) { return parseInt(x, 2); });
      var finalString = String.fromCharCode.apply(this, decimalArray);
      if (finalString.indexOf('@') > -1) {
	var username = finalString.substring(finalString.indexOf('@') + 1).split(" ")[0];
	var userid = this.convertToUserID(this, username);
	finalString = finalString.replace('@' + username, '<@' + userid + '>');
      }
      message.text = finalString;
    }
    if (this._isAwardingPoints(message)) {
      this._awardPoints(message);
    } else if (this._isDeductingPoints(message)) {
      this._deductPoints(message);
    } else if (this._isMentioningDumbledore(message)) {
      this._replyWithDumbledore(message);
    } else if (this._isGithub(message)) {
      this._replyWithGithub(message);
    }
  }
};

Dumbledore.prototype._isChatMessage = function (message) {
  //console.log('type: ' + message.type);
  //console.log('message: ' + message);
  //console.log('as string: ' + JSON.stringify(message));
  //console.log('boolean: ' + Boolean(message.text));
    return message.type === 'message' && (Boolean(message.text) || Boolean(message.attachments));
};

Dumbledore.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' &&
        message.channel[0] === 'C';
};

Dumbledore.prototype._isFromDumbledore = function (message) {
    return message.user === this.user.id;
};

Dumbledore.prototype._isFromSlackbot = function (message) {
    return message.user === 'USLACKBOT';
};

Dumbledore.prototype._isAwardingPoints = function (message) {
    return message.text.toLowerCase().indexOf('points to') > -1;
};

Dumbledore.prototype._isDeductingPoints = function (message) {
    return message.text.toLowerCase().indexOf('points from') > -1;
};

Dumbledore.prototype._isMentioningDumbledore = function (message) {
    return message.text.toLowerCase().indexOf('professor') > -1 ||
        message.text.toLowerCase().indexOf(this.name) > -1;
};

Dumbledore.prototype._isGithub = function (message) {
  //console.log('in isGithub message :' + message.text);
  return message.channel != null && message.channel === this.githubChannel;
};

Dumbledore.prototype._awardPoints = function (originalMessage) {
  debugger
    var self = this;
    var points = originalMessage.text.split(' ')[0].replace ( /[^\d.]/g, '' );
    if (points > 100) { points = 100; }
    //console.log('points type ' + (typeof points));
    //console.log('points ' + points);
    //console.log("is self defined? " + self);
    if (originalMessage.text.toLowerCase().indexOf('gryffindor') > -1) {
      self.db.run('UPDATE houses SET points = points + ? WHERE house = "gryffindor"', points);
      self.db.run('UPDATE students SET points_given = (points_given + ?) WHERE user_id = ?', points, originalMessage.user);
      self._getPointsFromDatabase(originalMessage, "gryffindor", self, self._awardPointsCallback);
    } else if (originalMessage.text.toLowerCase().indexOf('hufflepuff') > -1) {
      self.db.run('UPDATE houses SET points = points + ? WHERE house = "hufflepuff"', points);
      self.db.run('UPDATE students SET points_given = (points_given + ?) WHERE user_id = ?', points, originalMessage.user);
      self._getPointsFromDatabase(originalMessage, "hufflepuff", self, self._awardPointsCallback);
    } else if (originalMessage.text.toLowerCase().indexOf('ravenclaw') > -1) {
      self.db.run('UPDATE houses SET points = points + ? WHERE house = "ravenclaw"', points);
      self.db.run('UPDATE students SET points_given = (points_given + ?) WHERE user_id = ?', points, originalMessage.user);
      self._getPointsFromDatabase(originalMessage, "ravenclaw", self, self._awardPointsCallback);
    } else if (originalMessage.text.toLowerCase().indexOf('slytherin') > -1) {
      self.db.run('UPDATE houses SET points = points + ? WHERE house = "slytherin"', points);
      self.db.run('UPDATE students SET points_given = (points_given + ?) WHERE user_id = ?', points, originalMessage.user);
      self._getPointsFromDatabase(originalMessage, "slytherin", self, self._awardPointsCallback);
    } else if (originalMessage.text.toLowerCase().indexOf('@') > -1) {
        var student = originalMessage.text.substring(originalMessage.text.indexOf('@') + 1).split('>')[0];
        self.db.get('SELECT user_id, username, house FROM students WHERE user_id = ?', student, function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
	}
	if (record !== undefined) {
	  var message = originalMessage;
	  message.text = points + " " + record.house;
	  self._awardPoints(message);
	  self.db.run('UPDATE students SET points_earned = (points_earned + ?) WHERE user_id = ?', points, student);
	}
       });
    }
};

Dumbledore.prototype._deductPoints = function (originalMessage) {
    var self = this;
    var points = originalMessage.text.split(' ')[0].replace ( /[^\d.]/g, '' );
    if (points > 100) { points = 100; }
    if (originalMessage.text.toLowerCase().indexOf('gryffindor') > -1) {
      self.db.run('UPDATE houses SET points = MAX(0, points - ?) WHERE house = "gryffindor"', points);
      self.db.run('UPDATE students SET points_taken = (points_taken + ?) WHERE user_id = ?', points, originalMessage.user);
      self._getPointsFromDatabase(originalMessage, "gryffindor", self, self._deductPointsCallback);
    } else if (originalMessage.text.toLowerCase().indexOf('hufflepuff') > -1) {
      self.db.run('UPDATE houses SET points = MAX(0, points - ?) WHERE house = "hufflepuff"', points);
      self._getPointsFromDatabase(originalMessage, "hufflepuff", self, self._deductPointsCallback);
      self.db.run('UPDATE students SET points_taken = (points_taken + ?) WHERE user_id = ?', points, originalMessage.user);
    } else if (originalMessage.text.toLowerCase().indexOf('ravenclaw') > -1) {
      self.db.run('UPDATE houses SET points = MAX(0, points - ?) WHERE house = "ravenclaw"', points);
      self._getPointsFromDatabase(originalMessage, "ravenclaw", self, self._deductPointsCallback);
      self.db.run('UPDATE students SET points_taken = (points_taken + ?) WHERE user_id = ?', points, originalMessage.user);
    } else if (originalMessage.text.toLowerCase().indexOf('slytherin') > -1) {
      self.db.run('UPDATE houses SET points = MAX(0, points - ?) WHERE house = "slytherin"', points);
      self._getPointsFromDatabase(originalMessage, "slytherin", self, self._deductPointsCallback);
      self.db.run('UPDATE students SET points_taken = (points_taken + ?) WHERE user_id = ?', points, originalMessage.user);
    } else if (originalMessage.text.toLowerCase().indexOf('@') > -1) {
        var student = originalMessage.text.substring(originalMessage.text.indexOf('@') + 1).split('>')[0];
        self.db.get('SELECT user_id, username, house FROM students WHERE user_id = ?', student, function (err, record) {
        if (err) {
            return console.error('DATABASE ERROR:', err);
	}
	if (record != undefined) {
	  var message = originalMessage;
	  message.text = points + " " + record.house;
          self._deductPoints(message);
	}
      });
    }
};

Dumbledore.prototype._replyWithDumbledore = function (originalMessage) {
  var self = this;
  var house;
  for(var h of ['gryffindor', 'hufflepuff', 'ravenclaw', 'slytherin']) {
    if (originalMessage.text.toLowerCase().indexOf(h) > -1) {
      house = h;
    }
  };
  if (originalMessage.text.toLowerCase().indexOf('who is winning the house cup') > -1) {
    self._getAllHouseScores(originalMessage, self, self._getAllHousePointsCallback);
  } else if (originalMessage.text.toLowerCase().indexOf('reset the scores please') > -1) {
    self._resetTheScores(originalMessage, self, self._announcePlainString);
  } else if (originalMessage.text.toLowerCase().indexOf('say hello to the students') > -1) {
    self._welcomeMessageManual(originalMessage, self);
  } else if (originalMessage.text.toLowerCase().indexOf('can i please join') > -1) {
    self._addStudentToHouse(originalMessage, null, self, null /*self._studentJoinedHouse*/);
  } else if (originalMessage.text.toLowerCase().indexOf('i would like to put my fate in the hands of the sorting hat') > -1) {
    self._rollTheDice(originalMessage, self);
  } else if ((originalMessage.text.toLowerCase().indexOf('obliviate') > -1) && (originalMessage.text.toLowerCase().indexOf('@') > -1)) {
    self._obliviate(originalMessage, self);
  } else if (originalMessage.text.toLowerCase().indexOf('best student') > -1) {
    self._bestStudent(originalMessage, self);
  } else if (originalMessage.text.toLowerCase().indexOf('meanest student') > -1) {
    self._worstStudent(originalMessage, self);
  } else if ((originalMessage.text.toLowerCase().indexOf('tell me about') > -1) && (originalMessage.text.toLowerCase().indexOf('@') > -1)) {
    self._studentStats(originalMessage, self);
  } else if ((originalMessage.text.toLowerCase().indexOf('tell me about') > -1) && (house != undefined)) {
    self._getAllStudentsFromHouse(originalMessage, house, self);
  } else if ((originalMessage.text.toLowerCase().indexOf('tell me about') > -1) && (originalMessage.text.toLowerCase().indexOf('jason\'s mom') > -1)) {
    self._announcePlainString(originalMessage, 'Not much is known about Jason\'s mom, except that she is thought to be responsible for the great internet unplugging of 2016', self);
  } else if (originalMessage.text.toLowerCase().indexOf('start the sorting ceremony') > -1) {
    self._explainSorting(originalMessage, self);
  } else if (originalMessage.text.toLowerCase().indexOf('hogwarts roster') > -1) {
    self._getAllStudents(originalMessage, self);
  } else if (originalMessage.text.toLowerCase().indexOf('link my github name=') > -1) {
    self._saveGitName(originalMessage, self);
  } else if (originalMessage.text.toLowerCase().indexOf('sort the rest') > -1) {
    self._forceSortRemaining(originalMessage, self);
  }
};

Dumbledore.prototype._replyWithGithub = function (originalMessage)  {
  var self = this;
  //console.log(originalMessage.attachments[0].text);
  //console.log('channel id :' + originalMessage.channel);
  if (originalMessage.attachments[0].pretext !== undefined) {
  if (originalMessage.attachments[0].pretext.indexOf('New comment by ') > -1) {
    var gitUser = originalMessage.attachments[0].pretext.split('New comment by ')[1].split(' ')[0];
    //console.log('Git User: ' + gitUser);
    if (originalMessage.attachments[0].text.indexOf(':+1:') > -1) {
      self.db.get('SELECT * FROM students WHERE github_name = ?', gitUser, function (err, record) {
	if (err) {
	  return console.error('DATABASE ERROR', err);
	} if (record != undefined) {
	  self.db.run('UPDATE students SET points_earned = (points_earned + ?) WHERE user_id = ?', 5, record.user_id);
	  self.db.run('UPDATE houses SET points = points + ? WHERE house = ?', 5, record.house);
	}
      });
    }
  }
  }
};

Dumbledore.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

Dumbledore.prototype._explainSorting = function (originalMessage, bot) {
  bot._announcePlainString(originalMessage, 'Students you have two choices for sorting. If you wish to choose your house you need only ask \`Professor can I please join Gryffindor\` For those more daring, you can let the Hat of Godric Gryffindor decide. Just say \`Professor I would like to put my fate in the hands of the Sorting Hat\` \n Good luck, let the sorting begin.', bot);
};

Dumbledore.prototype._awardPointsCallback = function (originalMessage, house, bot, result) {
  var bot = bot;
  //console.log(result !== undefined);
  bot.postMessageToChannel(bot._getChannelById(originalMessage.channel).name, 'Congratulations ' + house.capitalizeFirstLetter() + '! ' + house.capitalizeFirstLetter() + ' house has ' + result.points + ' points!', {as_user: true});
};

Dumbledore.prototype._deductPointsCallback = function (originalMessage, house, bot, result) {
  var bot = bot;
  //console.log(result !== undefined);
  bot.postMessageToChannel(bot._getChannelById(originalMessage.channel).name, 'Alas ' + house.capitalizeFirstLetter() + '. ' + house.capitalizeFirstLetter() + ' house now only has ' + result.points + ' points. Do not dwell on your misdeeds, there is potential for greatness in all students!', {as_user: true});
};

Dumbledore.prototype._getAllHousePointsCallback = function(originalMessage, house, bot, result) {
  var bot = bot;
  bot.postMessageToChannel(bot._getChannelById(originalMessage.channel).name, house.capitalizeFirstLetter() + ' House: ' + result.points + '\n', {as_user: true});
};

Dumbledore.prototype._announcePlainString = function (orignalMessage, message, bot) {
  var bot = bot;
  bot.postMessageToChannel(bot._getChannelById(orignalMessage.channel).name, message, {as_user: true, link_names: 1});
};

Dumbledore.prototype._getPointsFromDatabase = function(originalMessage, house, bot, callback) {
  //console.log('bot' + bot);
  var bot = bot;
  //console.log('self is undefined in get points ' + (butts === undefined));
  bot.db.get('SELECT points FROM houses WHERE house = ?', house,  function(err, record) {
    debugger
    if (err || record === undefined) {
      return console.error('DATABASE ERROR', err);
    }

    if (typeof callback === "function") {
      callback(originalMessage, house, bot, record);
    }
  });
};

Dumbledore.prototype._saveGitName = function (originalMessage, bot) {
  var gitName = originalMessage.text.split('=')[1];
  var user = originalMessage.user;
  bot.db.run('UPDATE students SET github_name = ? WHERE user_id = ?', gitName, user, function (err, respond) {
    if (err) {
      return console.error('DATABASE ERROR', err);
    }
    bot._announcePlainString(originalMessage, bot.convertToUserName(bot, user) + '\'s github name is saved as ' + gitName, bot);
  });
};

Dumbledore.prototype._resetTheScores = function (originalMessage, bot, callback) {
  var bot = bot;
  bot.db.run('UPDATE houses SET points = 0');
  callback(originalMessage, "The scores have been reset and we are ready for another great year at Hogwarts!", bot);
};

Dumbledore.prototype._obliviate = function (originalMessage, bot) {
  var student = originalMessage.text.substring(originalMessage.text.indexOf('@') + 1).split('>')[0];
  if (student === originalMessage.user) {
    bot.db.run('DELETE FROM students WHERE user_id = ?', student, function (err, record) {
      if (err) {
	return console.error('DATABASE ERROR', err);
      }
      bot._announcePlainString(originalMessage, 'Poof, even a remembrall wont help you now Gilderoy', bot);
    });
  }
};

Dumbledore.prototype._studentStats = function (originalMessage, bot) {
  var student = originalMessage.text.substring(originalMessage.text.indexOf('@') + 1).split('>')[0];
  if (bot.convertToUserName(bot, student) !== 'dumbledore') {
  bot.db.get('SELECT * FROM students WHERE user_id = ?', student, function (err, record) {
    if (err) {
      return console.error('DATABASE ERROR', err);
    }
    if (record != undefined) {
      bot._announcePlainString(originalMessage, record.username + ' belongs to ' + record.house.capitalizeFirstLetter() + ' House, they have: \n earned: ' + record.points_earned + ' points \n taken: ' + record.points_taken + ' points \n given: ' + record.points_given + ' points \n' + 'I\'m sure if you asked them in person they would tell you all this information themself. Good day.', bot);
    } else {
      bot._announcePlainString(originalMessage, 'I am unfamiliar with that student. In all my years I have never come across such a person. However, if they are over the age of 11 and possess magical abilities, I invite them to come to Hogwarts. Perhaps they are a muggle, or worse a Squib.', bot);
    }
  });
  } else {
    bot._announcePlainString(originalMessage, 'Well my name is Albus Percival Wulfric Brian Dumbledore, I am Headmaster of Hogwarts, I am famous for discovering the 12 uses of Dragon\'s blood, and my favorite candy is Lemon Drops.', bot);
  }
};

Dumbledore.prototype._bestStudent = function (originalMessage, bot) {
  for (var house of ['gryffindor', 'hufflepuff', 'ravenclaw', 'slytherin']) {
    bot.db.get('SELECT * FROM students WHERE house = ? ORDER BY points_earned DESC', house, function (err, record) {
      if (err) {
	return console.error('DATABASE ERROR', err);
      }
      if (record !== undefined) {
	bot._announcePlainString(originalMessage, 'The head boy/girl of ' + record.house.capitalizeFirstLetter() + ' is @' + record.username + ' with ' + record.points_earned + ' points!', bot);
      }
    });
  } bot._announcePlainString(originalMessage, '\n I think they\'ve earned some Chocolate Frogs.', bot);
};

Dumbledore.prototype._worstStudent = function (originalMessage, bot) {
  for (var house of ['gryffindor', 'hufflepuff', 'ravenclaw', 'slytherin']) {
    bot.db.get('SELECT * FROM students WHERE house = ? ORDER BY points_taken DESC', house, function (err, record) {
      if (err) {
	return console.error('DATABASE ERROR', err);
      }
      if (record !== undefined) {
	bot._announcePlainString(originalMessage, 'The student most likely to join the Inquisitorial Squad in ' + record.house.capitalizeFirstLetter() + ' is @' + record.username + ' who has taken a total of ' + record.points_taken + ' from their fellow students.', bot);
      }
    });
  }
};

Dumbledore.prototype._getAllStudents = function (originalMessage, bot) {
  bot.db.all('SELECT * FROM students', function (err, record) {
    if (err) {
      return console.error('DATABASE ERROR', err);
    }
    for (var house of ['gryffindor', 'hufflepuff', 'ravenclaw', 'slytherin']) {
      bot._getAllStudentsFromHouse(originalMessage, house, bot);
    };
  });
};

Dumbledore.prototype._getAllStudentsFromHouse = function (originalMessage, house, bot) {
  bot.db.all('SELECT * FROM students WHERE house = ? ', house, function(err, record) {
    if (err) {
      return console.error('DATABASE ERROR', err);
    }
    var students = 'The students of ' + house.capitalizeFirstLetter() + ' House are:\n';
    for (var name of record) {
      students = students + name.username + '\n';
    }
    bot._announcePlainString(originalMessage, students, bot);
  });
};




Dumbledore.prototype._getAllHouseScores = function(originalMessage, bot, callback) {
  bot.postMessageToChannel(bot._getChannelById(originalMessage.channel).name, 'The House Points are: \n', {as_user: true}, function() {
  bot._getPointsFromDatabase(originalMessage, "gryffindor", bot, callback);
  bot._getPointsFromDatabase(originalMessage, "hufflepuff", bot, callback);
  bot._getPointsFromDatabase(originalMessage, "ravenclaw", bot, callback);
  bot._getPointsFromDatabase(originalMessage, "slytherin", bot, callback);
  });
};

Dumbledore.prototype._rollTheDice = function (originalMessage, bot) {
  var house = random.integer(0,3);
  switch(house) {
    case 0:
      bot._addStudentToHouse(originalMessage, 'gryffindor', bot, null);
      break;
    case 1:
      bot._addStudentToHouse(originalMessage, 'hufflepuff', bot, null);
      break;
    case 2:
      bot._addStudentToHouse(originalMessage, 'ravenclaw', bot, null);
      break;
    case 3:
      bot._addStudentToHouse(originalMessage, 'slytherin', bot, null);
      break;
  };
};


Dumbledore.prototype._addStudentToHouse = function (originalMessage, house, bot, callback) {
  var bot = bot;
  //var student = originalMessage.text.substring(originalMessage.text.indexOf('@') + 1).split('>')[0];
  var student = originalMessage.user;
  var studentUsername = bot.convertToUserName(bot, student);
  var notAlreadyStudent = true;
  bot.db.all('SELECT * FROM students', function (err, respond) {
    if (err) {
      return console.error('DATABASE ERROR', err);
    }
    if (respond !== undefined) {
      for (var db_user of respond) {
        if (db_user.user_id == student) {
	  // bot._announcePlainString(originalMessage, studentUsername + ' You are already in a house. Once You have been sorted in that house you shall remain. But fear not, if you give it a chance you will see there is much to gain.', bot);
        notAlreadyStudent = false;
        break;
	}
      }
    }
    if (notAlreadyStudent === true) {
	if ((originalMessage.text.toLowerCase().indexOf('gryffindor') > -1) || house == 'gryffindor') {
	  bot.db.run('INSERT INTO students (user_id, username, house) VALUES (?, ?, "gryffindor")', student, studentUsername, function (err, respond) {
	    if (err) {
	      return console.error('DATABASE ERROR', err);
	    }
	    bot._greetNewStudent(originalMessage, studentUsername, 'gryffindor', bot);
	  });
	} else if ((originalMessage.text.toLowerCase().indexOf('hufflepuff') > -1) || house == 'hufflepuff') {
	  bot.db.run('INSERT INTO students (user_id, username, house) VALUES (?, ?, "hufflepuff")', student, studentUsername, function (err, respond) {
	    if (err) {
	      return console.error('DATABASE ERROR', err);
	    }
	    bot._greetNewStudent(originalMessage, studentUsername, 'hufflepuff', bot);
	  });
	} else if ((originalMessage.text.toLowerCase().indexOf('ravenclaw') > -1) || house == 'ravenclaw') {
	  bot.db.run('INSERT INTO students (user_id, username, house) VALUES (?, ?, "ravenclaw")', student, studentUsername, function (err, respond) {
	    if (err) {
	      return console.error('DATABASE ERROR', err);
	    }
	    bot._greetNewStudent(originalMessage, studentUsername, 'ravenclaw', bot);
	  });
	} else if ((originalMessage.text.toLowerCase().indexOf('slytherin') > -1) || house == 'slytherin') {
	  bot.db.run('INSERT INTO students (user_id, username, house) VALUES (?, ?, "slytherin")', student, studentUsername, function (err, respond) {
	    if (err) {
	      return console.error('DATABASE ERROR', err);
	    }
	    bot._greetNewStudent(originalMessage, studentUsername, 'slytherin', bot);
	  });
	}
    }
  });
};


Dumbledore.prototype._greetNewStudent = function (originalMessage, student, house, bot) {
  var bot = bot;
  bot._announcePlainString(originalMessage, 'Welcome ' + student.capitalizeFirstLetter() + ' the house of ' + house.capitalizeFirstLetter() + ' expects great things from you!', bot);
};
//Slacks API converts an @username reference in a message to the userid this converts it back to username.
Dumbledore.prototype.convertToUserName = function (bot, key) {
  var bot = bot;
  for (var userid of bot.users) {
    if (userid.id == key || userid.name == key) {
      return userid.name;
    }
  }
};

Dumbledore.prototype.convertToUserID = function (bot, key) {
  if (key in bot.users) {
    return key
  }
  for (var userid of bot.users) {
    if (userid.name == key) {
      return userid.id;
    }
  }
};
/*
Dumbledore.prototype._forceSortRemaining = function (originalMessage, bot) {
  for (var i=0; i < bot.users.length; i++) {
    console.log('user id: ' + JSON.stringify(bot.users[i]));
    var message = originalMessage;
    message.user = bot.users[i].id;
    bot._rollTheDice(message, bot);
  };
};
*/
Dumbledore.prototype._forceSortRemaining = function (originalMessage, bot) {
  for (var userid of bot.users) {
    originalMessage.user = userid.id;
    (function (msg, bt) {
      bt._rollTheDice(msg, bt);
    })(originalMessage, bot);
  };
};

module.exports = Dumbledore;

String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

