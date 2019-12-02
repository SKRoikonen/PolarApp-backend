var express = require("express");
var bodyParser = require("body-parser");
var mongodb = require("mongodb")
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
const jwt2 = require('njwt')
var config = require('./config');
var ObjectID = mongodb.ObjectID;

var USERS_COLLECTION = "users";
var ROUTES_COLLECTION = "routes";
var MYROUTES_COLLECTION = "myroutes";

var tokenRequired = false;

var AKey;
var AId;
const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
var singleUpload;
var s3;

var app = express();
app.use(bodyParser.json());

// Create link to Angular build directory
var distDir = __dirname + "/dist/";
app.use(express.static(distDir));

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;

// Connect to the database before starting the application server.
mongodb.MongoClient.connect(process.env.MONGODB_URI || "mongodb://skroikonen:m1ukum4uku@ds059957.mlab.com:59957/polarapp", { useNewUrlParser: true }, function (err, client) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  db = client.db();

  console.log("Database connection ready");

  /*db.collection(KEYS_COLLECTION).findOne({ type: 'AKey' }, function(err, docs) {
    AKey = docs['value'];
    db.collection(KEYS_COLLECTION).findOne({ type: 'AId' }, function(err, docs) {
      AId = docs['value'];
      aws.config.update({
        secretAccessKey: AKey,
        accessKeyId: AId,
        region: 'eu-north-1'
      });
      s3 = new aws.S3();
      const upload = multer({
        storage: multerS3({
          s3: s3,
          bucket: 'travelmanagerpictures',
          acl: 'public-read',
          metadata: function (req, file, cb) {
            cb(null, {fieldName: file.fieldname});
          },
          key: function (req, file, cb) {
            cb(null, Date.now().toString())
          }
        })
      })
      singleUpload = upload.single('image');
    });
  });
  */

  var server = app.listen(process.env.PORT || 4200, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
});

function tokenIsValid(token) {
  jwt.verify(token, config.secret, function(err, decoded) {
    if (err) { return false; } else { return true; }
  });
}

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

app.post("/users", function(req, res) {
  var token = req.headers['x-access-token'];
  if (tokenRequired && (!tokenIsValid(token || !token))) {
    handleError(res, "Invalid access token.", "Invalid access token.");
  } else {
    var newUser = req.body;
    db.collection(USERS_COLLECTION).findOne({email: newUser.email}, function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get users.");
    } else {
      if (docs == null) {
        newUser.password = bcrypt.hashSync(req.body.password, 8);
        db.collection(USERS_COLLECTION).insertOne(newUser, function(err, doc) {
        if (err) {
          handleError(res, err.message, "Failed to create new user.");
        } else {
          res.status(201).json(doc.ops[0]);
      }
    });
        } else {
          res.status(500).send("E-mail already exists");
        }
      }
    });
  }
});

app.post('/login', function(req, res) {
    // create a token
    /*var token = jwt.sign({ id: user._id }, config.secret, {
      expiresIn: 86400 // expires in 24 hours
    });*/
    //res.status(200).send({ auth: true, token: token });
    db.collection(USERS_COLLECTION).findOne({email: req.body.email}, function(err, docs) {
      if (err) {
        handleError(res, err.message, "Failed to get users.");
      } else {
        if (docs != null && bcrypt.compareSync(req.body.password, docs.password)) {
          var token = jwt.sign({ id: docs._id }, config.secret, {
            expiresIn: 86400 // expires in 24 hours
          });
          res.status(200).send({ auth: true, token: token });
        } else {
          res.status(401).send({ auth: false, token: null });
        }
      }
    });
});

app.get("/users", function(req, res) {
  var token = req.headers['x-access-token'];
  if (tokenRequired && (!tokenIsValid(token || !token))) {
    handleError(res, "Invalid access token.", "Invalid access token.");
  } else {
    db.collection(USERS_COLLECTION).find({}).toArray(function(err, docs) {
      if (err) {
        handleError(res, err.message, "Failed to get users.");
      } else {
        res.status(200).json(docs);
      }
    });
  }
  /*var token = req.headers['x-access-token'];
  if (!token) return res.status(401).send({ auth: false, message: 'No token provided.' });
  jwt.verify(token, config.secret, function(err, decoded) {
    if (err) {
       return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
    } else {
      db.collection(USERS_COLLECTION).find({}).toArray(function(err, docs) {
        if (err) {
          handleError(res, err.message, "Failed to get users.");
        } else {
          res.status(200).json(docs);
        }
      });
    }
  });*/
});

app.get("/users/:id", function(req, res) {
  var token = req.headers['x-access-token'];
  if (tokenRequired && (!tokenIsValid(token || !token))) {
    handleError(res, "Invalid access token.", "Invalid access token.");
  } else {
    db.collection(USERS_COLLECTION).findOne({_id: new ObjectID(req.params.id)}, function(err, docs) {
      if (err) {
        handleError(res, err.message, "Failed to get user.");
      } else {
        res.status(200).json(docs);
      }
    });
  }
});

app.get("/users/email/:email", function(req, res) {
  var token = req.headers['x-access-token'];
  if (tokenRequired && (!tokenIsValid(token || !token))) {
    handleError(res, "Invalid access token.", "Invalid access token.");
  } else {
    db.collection(USERS_COLLECTION).findOne({email: req.params.email}, function(err, docs) {
      if (err) {
        handleError(res, err.message, "Failed to get user.");
      } else {
        res.status(200).json(docs);
      }
    });
  }
});


app.delete("/users/:id", function(req, res) {
  var token = req.headers['x-access-token'];
  if (tokenRequired && (!tokenIsValid(token || !token))) {
    handleError(res, "Invalid access token.", "Invalid access token.");
  } else {
    db.collection(USERS_COLLECTION).deleteOne({_id: new ObjectID(req.params.id)}, function(err, result) {
      if (err) {
        handleError(res, err.message, "Failed to delete user");
      } else {
        res.status(200).json(req.params.id);
      }
    });
  }
});

app.get("/routes", function(req, res) {
  var token = req.headers['x-access-token'];
  if (tokenRequired && (!tokenIsValid(token || !token))) {
    handleError(res, "Invalid access token.", "Invalid access token.");
  } else {
    db.collection(ROUTES_COLLECTION).find({}).toArray(function(err, docs) {
      if (err) {
        handleError(res, err.message, "Failed to get routes.");
      } else {
        res.status(200).json(docs);
      }
    });
  }
});

app.get("/routes/:id", function(req, res) {
  var token = req.headers['x-access-token'];
  if (tokenRequired && (!tokenIsValid(token || !token))) {
    handleError(res, "Invalid access token.", "Invalid access token.");
  } else {
    db.collection(ROUTES_COLLECTION).findOne({_id: new ObjectID(req.params.id)}, function(err, docs) {
      if (err) {
        handleError(res, err.message, "Failed to get route.");
      } else {
        res.status(200).json(docs);
      }
    });
  }
});

app.post("/routes", function(req, res) {
  var token = req.headers['x-access-token'];
  if (tokenRequired && (!tokenIsValid(token || !token))) {
    handleError(res, "Invalid access token.", "Invalid access token.");
  } else {
    var newRoute = req.body;
    db.collection(ROUTES_COLLECTION).insertOne(newRoute, function(err, doc) {
      if (err) {
        handleError(res, err.message, "Failed to create new route.");
      } else {
        var newMyRoute = JSON.parse('{ "userId":"' + doc.ops[0].userId + '" , "routeId":"' + doc.ops[0]._id + '" }');
        db.collection(MYROUTES_COLLECTION).insertOne(newMyRoute, function(err, doc) {
          if (err) { }
        });
        res.status(201).json(doc.ops[0]);
      }
    });
  }
});

app.delete("/routes/:id", function(req, res) {
  var token = req.headers['x-access-token'];
  if (tokenRequired && (!tokenIsValid(token || !token))) {
    handleError(res, "Invalid access token.", "Invalid access token.");
  } else {
    db.collection(ROUTES_COLLECTION).deleteOne({_id: new ObjectID(req.params.id)}, function(err, result) {
      if (err) {
        handleError(res, err.message, "Failed to delete route");
      } else {
        res.status(200).json(req.params.id);
      }
    });
  }
});

/*app.get("/players/email/:email", function(req, res) {
  db.collection(PLAYERS_COLLECTION).findOne({email: req.params.email}, function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get player.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.post("/teams", function(req, res) {
  var newTeam = req.body;
  db.collection(TEAMS_COLLECTION).insertOne(newTeam, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to create new team.");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

app.get("/teams", function(req, res) {
  db.collection(TEAMS_COLLECTION).find({}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get teams.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.get("/teams/:id", function(req, res) {
  db.collection(TEAMS_COLLECTION).findOne({_id: new ObjectID(req.params.id)}, function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get team.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.delete("/teams/:id", function(req, res) {
  db.collection(TEAMS_COLLECTION).deleteOne({_id: new ObjectID(req.params.id)}, function(err, result) {
    if (err) {
      handleError(res, err.message, "Failed to delete team");
    } else {
      res.status(200).json(req.params.id);
    }
  });
});

app.post("/memberships", function(req, res) {
  var newMembership = req.body;
  db.collection(MEMBERSHIPS_COLLECTION).insertOne(newMembership, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to create new membership.");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

app.get("/memberships/:playerId", function(req, res) {
  db.collection(MEMBERSHIPS_COLLECTION).find({playerId: req.params.playerId}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get memberships.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.get("/teams/playerId/:playerId", function(req, res) {
  db.collection(MEMBERSHIPS_COLLECTION).find({playerId: req.params.playerId}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get memberships.");
    } else {
      var teams = [];
      //console.log(docs);
      docs.forEach(membership => {
        db.collection(TEAMS_COLLECTION).findOne({_id: new ObjectID(membership.teamId)}, function(err, docs2) {
          if (err) {
            handleError(res, err.message, "Failed to get team.");
          } else {
            //console.log(membership.teamId)
            teams.push(docs2);
            if (teams.length >= docs.length) {
              //console.log(teams);
              res.status(200).json(teams);
            }
          }
        });
      });
    }
  });
});

app.get("/players/teamId/:teamId", function(req, res) {
  db.collection(MEMBERSHIPS_COLLECTION).find({teamId: req.params.teamId}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get memberships.");
    } else {
      var players = [];
      //console.log(docs);
      docs.forEach(membership => {
        db.collection(PLAYERS_COLLECTION).findOne({_id: new ObjectID(membership.playerId)}, function(err, docs2) {
          if (err) {
            handleError(res, err.message, "Failed to get player.");
          } else {
            //console.log(membership.playerId)
            players.push(docs2);
            if (players.length >= docs.length) {
              //console.log(players);
              res.status(200).json(players);
            }
          }
        });
      });
    }
  });
});

app.put("/players/:id", function(req, res) {
  var updateDoc = req.body;
  delete updateDoc._id;

  db.collection(PLAYERS_COLLECTION).replaceOne({_id: new ObjectID(req.params.id)}, updateDoc, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to update player");
    } else {
      updateDoc._id = req.params.id;
      res.status(200).json(updateDoc);
    }
  });
});

app.post("/stats", function(req, res) {
  var newStat = req.body;
  db.collection(STATS_COLLECTION).insertOne(newStat, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to create new stat.");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

app.get("/stats/playerId/:playerId", function(req, res) {
  db.collection(STATS_COLLECTION).find({playerId: req.params.playerId}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get stats.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.get("/memberships/:ids", function(req, res) {
  var idsplit = req.params.ids.toString().split('&');
  var travId = idsplit[0];
  var tripId = idsplit[1];
  db.collection(MEMBERSHIPS_COLLECTION).find({travellerId: travId, tripId: tripId}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get memberships.");
    } else {
      res.status(200).json(docs);
    }
  });
});

*/



/*
app.post("/api/travellers", function(req, res) {
  var newTraveller = req.body;
  db.collection(TRAVELLERS_COLLECTION).insertOne(newTraveller, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to create new traveller.");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

app.get("/api/travellers/username/:username", function(req, res) {
  db.collection(TRAVELLERS_COLLECTION).findOne({username: req.params.username}, function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get traveller.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.get("/api/travellers/id/:id", function(req, res) {
  db.collection(TRAVELLERS_COLLECTION).findOne({_id: new ObjectID(req.params.id)}, function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get traveller.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.get("/api/trips", function(req, res) {
  db.collection(TRIPS_COLLECTION).find({}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get trips.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.get("/api/trips/:id", function(req, res) {
  db.collection(TRIPS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) }, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to get trip");
    } else {
      res.status(200).json(doc);
    }
  });
});

app.post("/api/trips", function(req, res) {
  var newTrip = req.body;
  db.collection(TRIPS_COLLECTION).insertOne(newTrip, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to create new trip.");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

app.get("/api/trips/dates/:starttoend", function(req, res) {
  var datesplit = req.params.starttoend.toString().split('to');
  var startdate = datesplit[0];
  var enddate = datesplit[1];
  db.collection(TRIPS_COLLECTION).find({datestart: { $gte : startdate }, dateend: { $lte: enddate }, public: true }).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get trips.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.get("/api/trips/coords/:latandlng", function(req, res) {
  var coordsplit = req.params.latandlng.toString().split('and');
  var lat = parseFloat(coordsplit[0]);
  var lng = parseFloat(coordsplit[1]);
  db.collection(TRIPS_COLLECTION).find({lat: lat, long: lng}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get trips.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.put("/api/trips/:id", function(req, res) {
  var updateDoc = req.body;
  delete updateDoc._id;

  db.collection(TRIPS_COLLECTION).replaceOne({_id: new ObjectID(req.params.id)}, updateDoc, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to update trip");
    } else {
      updateDoc._id = req.params.id;
      res.status(200).json(updateDoc);
    }
  });
});


app.post("/api/transactions", function(req, res) {
  var newTransaction = req.body;
  newTransaction.timestamp = new Date();
  db.collection(TRANSACTIONS_COLLECTION).insertOne(newTransaction, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to create new transaction.");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

app.post("/api/markers", function(req, res) {
  var newMarker = req.body;
  db.collection(MARKERS_COLLECTION).insertOne(newMarker, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to create new marker.");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

app.get("/api/markers/id/:id", function(req, res) {
  db.collection(MARKERS_COLLECTION).findOne({_id: new ObjectID(req.params.id)}, function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get marker.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.get("/api/markers/tripId/:tripId", function(req, res) {
  let tripId = req.params.tripId;
  db.collection(MARKERS_COLLECTION).find({tripId: tripId}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get markers.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.put("/api/travellers/:id", function(req, res) {
  var updateDoc = req.body;
  delete updateDoc._id;

  db.collection(TRAVELLERS_COLLECTION).replaceOne({_id: new ObjectID(req.params.id)}, updateDoc, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to update traveller");
    } else {
      updateDoc._id = req.params.id;
      res.status(200).json(updateDoc);
    }
  });
});

app.get("/api/messages/tripId/:tripid", function(req, res) {
  let tripID = req.params.tripid;
  db.collection(MESSAGES_COLLECTION).find({tripId:tripID}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get messages.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.get("/api/notifications/tripId/:tripid", function(req, res) {
  let tripID = req.params.tripid;
  db.collection(NOTIFICATIONS_COLLECTION).find({tripId:tripID}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get notifications.");
    } else {
      res.status(200).json(docs);
    }
  });
});


app.post("/api/messages", function(req, res) {
  var newMessage = req.body;
  newMessage.timestamp = new Date();
  db.collection(MESSAGES_COLLECTION).insertOne(newMessage, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to post a message.");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

app.post("/api/notifications", function(req, res) {
  var newNotification = req.body;
  newNotification.timestamp = new Date();
  db.collection(NOTIFICATIONS_COLLECTION).insertOne(newNotification, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to post a notification.");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

app.get("/api/memberships/travellerId/:travellerId", function(req, res) {
  let travId = req.params.travellerId;
  db.collection(MEMBERSHIPS_COLLECTION).find({travellerId: travId}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get memberships.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.get("/api/memberships/tripId/:tripId", function(req, res) {
  let tripId = req.params.tripId;
  db.collection(MEMBERSHIPS_COLLECTION).find({tripId: tripId}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get memberships.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.get("/api/memberships/:ids", function(req, res) {
  var idsplit = req.params.ids.toString().split('&');
  var travId = idsplit[0];
  var tripId = idsplit[1];
  db.collection(MEMBERSHIPS_COLLECTION).find({travellerId: travId, tripId: tripId}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get memberships.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.post("/api/memberships", function(req, res) {
  var newMembership = req.body;
  db.collection(MEMBERSHIPS_COLLECTION).insertOne(newMembership, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to create new membership.");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

app.delete("/api/memberships/:id", function(req, res) {
  db.collection(MEMBERSHIPS_COLLECTION).deleteOne({_id: new ObjectID(req.params.id)}, function(err, result) {
    if (err) {
      handleError(res, err.message, "Failed to delete membership");
    } else {
      res.status(200).json(req.params.id);
    }
  });
});


app.delete("/api/markers/:id", function(req, res) {
  db.collection(MARKERS_COLLECTION).deleteOne({_id: new ObjectID(req.params.id)}, function(err, result) {
    if (err) {
      handleError(res, err.message, "Failed to delete marker");
    } else {
      res.status(200).json(req.params.id);
    }
  });
});

app.delete("/api/trips/:id", function(req, res) {
  db.collection(TRIPS_COLLECTION).deleteOne({_id: new ObjectID(req.params.id)}, function(err, result) {
    if (err) {
      handleError(res, err.message, "Failed to delete trip");
    } else {
      res.status(200).json(req.params.id);
    }
  });
});

app.delete("/api/memberships/tripId/:id", function(req, res) {
  db.collection(MEMBERSHIPS_COLLECTION).deleteMany({tripId: req.params.id}, function(err, result) {
    if (err) {
      handleError(res, err.message, "Failed to delete memberships");
    } else {
      res.status(200).json(req.params.id);
    }
  });
});

app.delete("/api/notifications/tripId/:id", function(req, res) {
  db.collection(NOTIFICATIONS_COLLECTION).deleteMany({tripId: req.params.id}, function(err, result) {
    if (err) {
      handleError(res, err.message, "Failed to delete notifications");
    } else {
      res.status(200).json(req.params.id);
    }
  });
});

app.delete("/api/markers/tripId/:id", function(req, res) {
  db.collection(MARKERS_COLLECTION).deleteMany({tripId: req.params.id}, function(err, result) {
    if (err) {
      handleError(res, err.message, "Failed to delete markers");
    } else {
      res.status(200).json(req.params.id);
    }
  });
});

app.delete("/api/messages/tripId/:id", function(req, res) {
  db.collection(MESSAGES_COLLECTION).deleteMany({tripId: req.params.id}, function(err, result) {
    if (err) {
      handleError(res, err.message, "Failed to delete messages");
    } else {
      res.status(200).json(req.params.id);
    }
  });
});

app.post('/api/image-upload', function(req, res) {

  singleUpload(req, res, function(err) {

    if (err) {
      return res.status(422).send({errors: [{title: 'File Upload Error', detail: err.message}] });
    }

    return res.json({'imageUrl': req.file.location});
  });
});

app.delete('/api/image-upload/:key', function(req, res) {
  var fileKey = req.params.key;
  var params = {
    Bucket: 'travelmanagerpictures',
    Key: fileKey
  };
  s3.deleteObject(params, function(err) {
    if (err) {
      handleError(res, err.message, "Failed to delete object.");
    } else {
      return res.status(200).json(req.params.key);
    }
  });
});

app.get("/api/keys/:type", function(req, res) {
  db.collection(KEYS_COLLECTION).findOne({ type: req.params.type }, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to get key");
    } else {
      res.status(200).json(doc);
    }
  });
});

app.get("/api/transactions/freeloader/:freeloaderAndTrip", function(req, res) {
  var paramsplit = req.params.freeloaderAndTrip.toString().split('OnTrip');
  let freeloader = paramsplit[0];
  let tripId = paramsplit[1];
  db.collection(TRANSACTIONS_COLLECTION).find({freeloader: freeloader, tripId: tripId}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get transactions.");
    } else {
      res.status(200).json(docs);
    }
  });
});

app.get("/api/transactions/payer/:payerAndTrip", function(req, res) {
  var paramsplit = req.params.payerAndTrip.toString().split('OnTrip');
  let payer = paramsplit[0];
  let tripId = paramsplit[1];
  db.collection(TRANSACTIONS_COLLECTION).find({payer: payer, tripId: tripId}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get transactions.");
    } else {
      res.status(200).json(docs);
    }
  });
});
app.delete("/api/transactions/:id", function(req, res) {
  db.collection(TRANSACTIONS_COLLECTION).deleteOne({_id: new ObjectID(req.params.id)}, function(err, result) {
    if (err) {
      handleError(res, err.message, "Failed to delete transaction");
    } else {
      res.status(200).json(req.params.id);
    }
  });
});
*/
