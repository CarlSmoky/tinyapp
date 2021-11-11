const express = require("express");

const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const cookieSession = require('cookie-session');
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2']
}));

const bcrypt = require('bcryptjs');
const saltRounds = 10;

const { getUserByEmail } = require("./helpers.js");

const urlDatabase = {
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "aJ48lW"
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "aJ48lW"
  }
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
};



const generateRandomString = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};



//The body-parser library will convert the request body from a Buffer into string that we can read. It will then add the data to the req(request) object under the key body.
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));


app.post("/urls", (req, res) => {
  if (!req.session.user_id) {
    res.send('You need to login to add a new url');
    return;
  }
  console.log(req.body);  // Log the POST request body to the console
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = { longURL: req.body.longURL, userID: req.session.user_id };
  res.redirect(`/urls/${shortURL}`);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  if (!req.session.user_id) {
    res.send("<p>You need to login to delte.</p> <a href = /login> Go to login page</a>");
    return;
  }
  const shortURL = req.params.shortURL;
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

app.post("/urls/:shortURL/edit", (req, res) => {
  if (!req.session.user_id) {
    res.send("<p>You need to login to edit.</p> <a href = /login> Go to login page</a>");
    return;
  }
  if (req.body.longURL) {
    urlDatabase[req.params.shortURL] = { longURL: req.body.longURL, userID: req.session.user_id };
    const fileterdUrlDatabase = urlsForUser(req.session.user_id);
    const templateVars = { urls: fileterdUrlDatabase, user: users[req.session.user_id] };
    res.render("urls_index", templateVars);
  } else {
    const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL].longURL, user: users[req.session.user_id] };
    res.render("urls_show", templateVars);
  }
});

app.post("/login", (req, res) => {
  const user = getUserByEmail(req.body.email, users);
  if (user) {
    bcrypt.compare(req.body.password, user.password).then(result => {
      if (result) {
        // res.cookie('user_id', user.id);
        // eslint-disable-next-line camelcase
        req.session.user_id = user.id;
        res.redirect('/urls');
      } else {
        res.status(403);
        res.send("Incorrect Password!");
      }
    });
  } else {
    res.send("This email is not registered");
  }
});

app.post("/logout", (req, res) => {
  req.session = null;
  // res.clearCookie('user_id');
  res.redirect("/urls");
});

app.post("/register", (req, res) => {
  if (req.body.email === '' || req.body.password === '') {
    res.status(400);
    res.send('Email and password cannot be brank');
    return;
  }

  const user = getUserByEmail(req.body.email, users);
  if (user) {
    res.status(400);
    res.send('Email is already registered');
    return;
  }

  const id = generateRandomString();
  const password = req.body.password; // found in the req.params object
  const hashedPassword = bcrypt.hashSync(password, saltRounds);

  users[id] = { id: id, email: req.body.email, password: hashedPassword };
  req.session.user_id = id;
  res.redirect("/urls");
});

app.get("/", (req, res) => {
  res.send("Hello!");
});

//helper
const urlsForUser = id => {
  let urls = {};
  for (const key in urlDatabase) {
    if (urlDatabase[key].userID === id) {
      urls[key] = urlDatabase[key];
    }
  }
  return urls;
};

app.get("/urls", (req, res) => {
  if (!req.session.user_id) {
    res.send("<p>You need to login first</p> <a href = /login> Go to login page</a>");
    return;
  }
  const fileterdUrlDatabase = urlsForUser(req.session.user_id);
  const templateVars = { urls: fileterdUrlDatabase, user: users[req.session.user_id] };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  if (req.session.user_id) {
    const templateVars = { user: users[req.session.user_id] };
    res.render("urls_new", templateVars);
    return;
  }
  res.redirect("/login");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls/:shortURL", (req, res) => {
  if (!req.session.user_id) {
    res.send("<p>You need to login first</p> <a href = /login> Go to login page</a>");
    return;
  }
  const fileterdUrlDatabase = urlsForUser(req.session.user_id);
  if (!fileterdUrlDatabase[req.params.shortURL]) {
    res.send(`The shortURL ${req.params.shortURL} isn't registered or is resitered by someone else. You can see only urls are registered by you.`);
    return;
  }
  const templateVars = { shortURL: req.params.shortURL, longURL: fileterdUrlDatabase[req.params.shortURL].longURL, user: users[req.session.user_id] };
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  if (!urlDatabase[req.params.shortURL]) {
    res.send("The short URL isn't registered.");
    return;
  }
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/register", (req, res) => {
  const templateVars = { user: null };
  req.session.user_id ? res.redirect("/urls") : res.render("urls_register", templateVars);
});

app.get("/login", (req, res) => {
  const templateVars = { user: null };
  req.session.user_id ? res.redirect("/urls") : res.render("urls_login", templateVars);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
