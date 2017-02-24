// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
// Requiring our Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");
// Mongoose mpromise deprecated - use bluebird promises
var Promise = require("bluebird");

mongoose.Promise = Promise;

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: false
}));

// Make public a static dir
app.use(express.static("public"));

if (process.env.MONGODB_URI) {
    // Database configuration with mongoose if on Heroku
    mongoose.connect(process.env.MONGODB_URI);
} else {
    // Database configuration with mongoose if on Local Machine
    mongoose.connect("mongodb://localhost/latestnews");
}

var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
  console.log("Mongoose connection successful.");
});

// Set Handlebars.
var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Routes
// ======

// Simple index routes
app.get("/", function(req, res) {
  Article.find({}, function(error, doc) {
    var hbsObject = {
        articles: doc
    };
    console.log(hbsObject);
    res.render("index", hbsObject);
  });
});

app.get("/saved", function(req, res) {
    Article.find({}).populate("note")
    .exec(function(error,doc) {
        if (error) {
            console.log(error);
        }
        else {
            var hbsObject = {
            articles: doc
            }
            res.render("saved", hbsObject);
        }
    });
});

// A GET request to scrape the npr website
app.get("/scrape", function(req, res) {
  // Grab the body of the html 
  request("http://www.npr.org/sections/news/", function(error, response, html) {
    // load into cheerio
    var $ = cheerio.load(html);
    // grab every h2
    $("h2.title").each(function(i, element) {

      var result = {};

      // Add the text and href of every link
      result.title = $(this).children("a").text();
      result.link = $(this).children("a").attr("href");

      // create a new entry in Article model
      var entry = new Article(result);

      // save to db
      entry.save(function(err, doc) {
        if (err) {
          console.log(err);
        }
        else {
          console.log(doc);
        }
      });

    });          
    res.redirect("/");
  });
});

// A POST request to save an article
app.post("/save/:id?", function(req, res) {
    Article.findOneAndUpdate({"_id": req.params.id }, { "saved": true })
    .exec(function(err, doc) {
        if (err) {
            console.log(err);
        }
        else {
            res.redirect("/");
        }
    });
});

// A POST request to un-save an article
app.post("/remove/:id?", function(req, res) {
    console.log("this is the id"+req.params.id);
    Article.findOneAndUpdate({"_id": req.params.id }, { "saved": false })
    .exec(function(err, doc) {
        if (err) {
            console.log(err);
        }
        else {
            res.redirect("/saved");
        }
    });
});

// A POST request to save a note
app.post("/addNote/:id?", function(req, res) {
    var newNote = new Note(req.body);
    newNote.save(function(error, doc) {
        if (error) {
            console.log(error);
        }
        else {
            Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
            .exec(function(err, doc) {
                if(err) {
                    console.log(err);
                }
                else {
                    res.redirect("/saved");
                }
            });
        }
    });
});

// A POST request to delete a Note
app.post("/deleteNote/:id", function(req, res) {
    Note.remove({_id: req.params.id}, function(error) {
        if (error) {
            console.log(error);
        }
        else {
            res.redirect("/saved");
        }
    });
});

// Listen on PORT
app.listen(PORT, function() {
  console.log("App running on port " + PORT);
});