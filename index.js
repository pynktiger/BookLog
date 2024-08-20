import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "book",
  password: "qwerty7",
  port: 5432,
});
db.connect();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let books = [];
let notes = [];
let bookId = '';

async function checkRead(sortby = ''){
  books = [];
  let query = 'select * from read_books';
  if (sortby == 'rating') {
    query += ' order by rating desc';
  } else if (sortby == 'title') {
    query += ' order by title asc';
  }
  const results = await db.query(query);
  results.rows.forEach(result => {
    books.push(result)
  });
};

app.get("/", async (req, res) => {
  try {
    await checkRead();
    res.render("index.ejs", {
      books: books,
    });
  } catch (error) {
    console.error("Failed to make request:", error.message);
    res.render("index.ejs", {
      error: error.message,
    });
  }
});

app.post("/", async (req, res) => {
  const sortby = req.body.sort;
  console.log('sorting by: ' + sortby);
  try {
    await checkRead(sortby);
    res.render("index.ejs", { books: books });
  } catch (error) {
    console.error("Failed to make request:", error.message);
    res.render("index.ejs", { error: error.message });
  }
});

app.get("/book/:id", async (req, res) => {
  bookId = req.params.id;
  notes = [];
  try{
    const result = await db.query('SELECT written FROM notes WHERE notes_id = $1', [bookId]);
    notes = result.rows.map(note => note.written); // Extract the 'written' field from each note
    console.log(notes)
    if (notes) {
      res.render("notes.ejs", { notes: notes });
    } else {
      res.status(404).send("No notes for this book found.");
    }
  }catch (error) {
    console.error("Failed to fetch book details:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/book/:id", async (req, res) => {
  const written = req.body.newNote
  console.log(bookId, written);
  try {
    // Insert the new note into the database
    await db.query('INSERT INTO notes (notes_id, written) VALUES ($1, $2)', [bookId, written]);

    // Fetch the updated list of notes
    const result = await db.query('SELECT written FROM notes WHERE notes_id = $1', [bookId]);
    const notes = result.rows.map(note => note.written);

    // Render the updated notes list
    res.render('notes.ejs', { notes: notes });
  } catch (error) {
    console.error("Failed to create note:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/new-book",(req, res) => {
  res.render('new.ejs');
});

app.post("/new-book", async (req, res) => {
  try{
  const bookTitle = req.body.title;
  const rating = req.body.rating;
  const summary = req.body.summary;
  const isbn = req.body.isbn;

  const isbnString = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`
  await db.query(
    'insert into read_books (title, rating, summary, isbn) values ($1, $2, $3, $4)', [bookTitle, rating, summary, isbnString]);
  }catch (error) {
    console.error("Failed to create new review:", error.message);
    res.status(500).send("Internal Server Error");
  };
  
  res.redirect('/');
});

app.post('/delete_book', async (req, res) => {
  const bookId = req.body.bookId;
  try {

    const result = await db.query('DELETE FROM read_books WHERE id = $1', [bookId]);

    if (result.rowCount > 0) {
      res.status(200).send('Book deleted successfully');
      res.redirect('/')
    }
  } catch (error) {
    console.error('Failed to delete book:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

