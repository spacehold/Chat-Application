const app = require('express')();

const http = require('http').Server(app);
require('dotenv').config()
let ejs = require('ejs');
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;
const mongoose = require('mongoose');
const dbuser = process.env.DBUSER;

const cookieSession = require('cookie-session')

const dbpassword = process.env.DBPASSWORD;
const passport = require('passport')
const uri = "mongodb+srv://" + dbuser + ':' + dbpassword + "@cluster0.0dkbk.mongodb.net/SocketioTest?retryWrites=true&w=majority";
var GoogleStrategy = require('passport-google-oauth20').Strategy;

app.use(cookieSession({
  name: 'userSession',
  keys: ['key1', 'key2']
}))
app.use(passport.initialize());
app.use(passport.session());
function checkAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}
passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});
var findOrCreate = require('mongoose-findorcreate')
const messageSchema = new mongoose.Schema({
  message: String
});
const Message = mongoose.model('messages', messageSchema);
const userSchema = new mongoose.Schema({
  googleId: String
});
userSchema.plugin(findOrCreate);
const User = mongoose.model('users', userSchema);
console.log(process.env.CALLBACKURL)
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.CALLBACKURL
},
  function (accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
main().catch(err => console.log(err));

async function main() {
  await mongoose.connect(uri);
}
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });
app.get('/login', function (req, res) {
  if(req.isAuthenticated()){ return res.redirect('/'); }
  res.sendFile(__dirname + "/src/html/login.html");
})
app.get('/logout', function (req, res) {
  req.logout()
  res.redirect('/');
})
app.get('/', checkAuth, (req, res) => {
  


    ejs.renderFile("./src/html/index.ejs", {}, {}, async function (err, str) {
      res.send(str)
    })
 

});


io.on('connection', async (socket) => {
  var msgs = await Message.find({})
  msgs.forEach(element => {
    io.emit('chat message', element.message);
  });

  socket.on('chat message', msg => {
    const newMsg = new Message({
      message: msg
    })
    newMsg.save()
    io.emit('chat message', msg);
  });
});

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
