var mongoose = require("mongoose");
var Schema = mongoose.Schema;

// Create article schema
var ArticleSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true,
    unique: true
  },
  // save one note's ObjectId
  note: {
    type: Schema.Types.ObjectId,
    ref: "Note"
  },
  //   determine whether or not article is saved
  saved: {
      type: Boolean,
      default: false
  }
});

var Article = mongoose.model("Article", ArticleSchema);

module.exports = Article;
