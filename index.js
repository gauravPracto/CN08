const express = require("express");
const config = require("./config.json");
const app = express();
var cookieParser = require("cookie-parser");
const Cryptr = require("cryptr");
const cryptr = new Cryptr(config.ENCRYPTION_KEY);
const axios = require("axios");
const clientID = config.CLIENT_ID;
const clientSecret = config.CLIENT_SECRET;
var current = 0;
app.set("view engine", "ejs");
var access_token = clientSecret;
app.use(cookieParser());
var encryptedString;
app.get("/", function (req, res) {
  res.render("pages/index", { client_id: clientID });
});
app.get("/github/callback", (req, res) => {
  // The req.query object has the query params that were sent to this route.
  const requestToken = req.query.code;
  axios({
    method: "post",
    url: `https://github.com/login/oauth/access_token?client_id=${clientID}&client_secret=${clientSecret}&code=${requestToken}`,
    // Set the content type header, so that we get the response in JSON
    headers: {
      accept: "application/json",
    },
  }).then((response) => {
    access_token = response.data.access_token;
    encryptedString = cryptr.encrypt(access_token);
    res.cookie("auth_user", encryptedString);
    res.redirect("/success");
  });
});

var username = "";

app.get("/success", function (req, res) {
  axios({
    method: "get",
    url: `https://api.github.com/user`,
    headers: {
      Authorization: "token " + access_token,
    },
  })
    .then((response) => {
      username = response.data.login;
      res.render("pages/success", { userData: response.data });
    })
    .catch((e) => res.redirect("/"));
});

app.get("/activity", function (req, res) {
  if (cryptr.decrypt(req.cookies.auth_user) == access_token) {
    axios
      .get(`https://api.github.com/users/${username}/events`, {
        page: 2,
        Per_page: 100,
      })
      .then((e) => {
        res.render("pages/activity", {
          userData: e.data,
          current: current++,
        });
      })
      .catch((e) => {
        res.send("did not work");
      });
  } else {
    res.redirect("/");
  }
});

const port = process.env.PORT || 2400;
app.listen(port, () => console.log("App listening on port " + port));
