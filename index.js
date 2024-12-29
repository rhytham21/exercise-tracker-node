require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

// middlewares
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// db configurations
const DB_URI = process.env.DB_URI; // Use local MongoDB URI if not provided in .env
mongoose.connect(DB_URI);
mongoose.connection
  .on("error", console.log.bind(console, "connection error: "))
  .once("open", () => {
    console.log("database connection has been established successfully.");
  });

const ExerciseSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date
});

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const User = mongoose.model("User", UserSchema);
const Exercise = mongoose.model("Exercise", ExerciseSchema);

// --------------- routes --------------- \\

// main html
app.get("/", (_req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// create a new user
app.post("/api/users", async (req, res) => {
  const userObj = new User({
    username: req.body.username
  });
  try {
    const user = await userObj.save();
    console.log(user);
    res.json(user);
  } catch (error) {
    console.log(error);
  }
});

// get all users
app.get("/api/users", async (_req, res) => {
  const users = await User.find({}).select("_id username");
  if (!users) {
    res.send("No users found");
  } else {
    res.json(users);
  }
});

// create new exercise
app.post("/api/users/:_id/exercises", async function (req, res) {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res.status(400).json({ error: "Missing required fields: description or duration" });
  }

  const formattedDate = date ? new Date(date) : new Date();

  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      const exerciseObj = new Exercise({
        user_id: user._id,
        description,
        duration: parseInt(duration, 10), // Ensure duration is a number
        date: formattedDate
      });
      const exercise = await exerciseObj.save();
      res.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "There was an error saving the exercise" });
  }
});

// get user's logs
app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;
  const user = await User.findById(id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let dateObj = {};
  if (from) {
    dateObj["$gte"] = new Date(from);
  }
  if (to) {
    dateObj["$lte"] = new Date(to);
  }

  let filter = {
    user_id: id
  };
  if (from || to) {
    filter.date = dateObj;
  }

  try {
    const exercises = await Exercise.find(filter).limit(+limit || 500);

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration, // Ensure duration is returned as a number
      date: e.date.toDateString()
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "There was an error retrieving the logs" });
  }
});

// invalid route
app.use((req, res) => {
  res.json({ status: 404, message: "not found" });
});

// listener
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
