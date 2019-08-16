/**
 * db.run(`UPDATE terms SET num_mentions = num_mentions + 1 WHERE term = ${term}`), err => {
 */

require('dotenv').config();

const Twit = require('twit');
const fetch = require('node-fetch');

const stopwords = [
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself',
  'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself',
  'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these',
  'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do',
  'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while',
  'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before',
  'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'
];

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/xj-sqlite.db');

db.run('CREATE TABLE IF NOT EXISTS terms(id INTEGER PRIMARY KEY AUTOINCREMENT, term TEXT, num_mentions INTEGER)');
db.run('CREATE TABLE IF NOT EXISTS tweets(id INTEGER PRIMARY KEY AUTOINCREMENT, term TEXT, text TEXT)');

let T = new Twit({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
  timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
});

function closeDb(db) {
  db.close(err => {
    if (err) {
      console.error(err.message);
    }
    console.info('Closing db connection.');
  });
}

function findJournalismTerm(tweet) {
  const text = tweet.text;
  const regex = /(?:\s)(.[^\s]+) journalism/g;
  const match = regex.exec(text);

  if (!match || stopwords.indexOf(match[1].toLowerCase()) > -1) {
    return false;
  }

  return match ? match[1].trim().replace(/"|“/g, '').toLowerCase() : false;
}

function incrementTermDb({ tweet, term }) {
  db.run(`INSERT OR REPLACE INTO terms VALUES (
    COALESCE((SELECT id FROM terms WHERE term="${term}"), NULL), "${term}", 
    COALESCE((SELECT num_mentions FROM terms WHERE term="${term}"),
    0) + 1)`), err => {
    if (err) {
      return console.info(err.message);
    }

    // get the last insert id
    console.info(`${term} => A row has been updated.`);
  };
}

function saveTweetToDb({ tweet, term }) {
  const b64tweet = (new Buffer(tweet.text)).toString('base64');

  db.run(`INSERT INTO tweets VALUES (NULL, "${term}", "${b64tweet}")`, err => {
    if (err) {
      return console.info(err.message);
    }

    // get the last insert id
    console.info(`${term} => A row has been inserted.`);
  });
}

// Listen and filter on Twitter stream
let stream = T.stream('statuses/filter', {
  track: 'journalism', language: 'en'
});

stream.on('tweet', tweet => {
  const term = findJournalismTerm(tweet);

  if (!term) {
    return;
  }

  console.info(`${new Date().toISOString()} => ${term}`);
  incrementTermDb({ tweet, term });
  saveTweetToDb({ tweet, term });
});

console.info('Monitoring stream.');
