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

// Database configuration with mongoose
mongoose.connect("mongodb://localhost/latestnews");
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
  Article.find({}, function(error, doc) {
    var hbsObject = {
        articles: doc
    };
    console.log(hbsObject);
    res.render("saved", hbsObject);
  });
});

// A GET request to scrape the npr website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with request
  request("http://www.npr.org/sections/news/", function(error, response, html) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(html);
    // Now, we grab every h2 within an article tag, and do the following:
    $("h2.title").each(function(i, element) {

      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this).children("a").text();
      result.link = $(this).children("a").attr("href");

      // Using our Article model, create a new entry
      // This effectively passes the result object to the entry (and the title and link)
      var entry = new Article(result);

      // Now, save that entry to the db
      entry.save(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        // Or log the doc
        else {
          console.log(doc);
        }
      });

    });          
    // Tell the browser that we finished scraping the text
    res.redirect("/");
  });
});

// A POST request to save an article
app.post("/save/:id?", function(req, res) {
    console.log("this is the id"+req.params.id);
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

// Listen on PORT
app.listen(PORT, function() {
  console.log("App running on port " + PORT);
});