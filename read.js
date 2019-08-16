/**
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/xj-terms.db');

db.serialize(() => {
  db.each(`SELECT term as term, num_mentions as num_mentions FROM terms`, (err, row) => {
    if (err) {
      console.error(err.message);
    }

    console.info(`${row.term} => ${row.num_mentions}`);
  });
});

db.close(err => {
  if (err) {
    console.error(err.message);
  }

  console.info('Closing db connection.');
});