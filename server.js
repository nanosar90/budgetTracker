const express = require("express");
const logger = require("morgan");
const mongoose = require("mongoose");
const compression = require("compression");

const PORT = 3001;

const app = express();

app.use(logger("dev"));

app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static("public"));

const db = mongoose.connect(`mongodb+srv://nathan:password1234@cluster0.dfgvs.mongodb.net/budgetTracker?retryWrites=true&w=majority`, {
    useNewUrlParser: true,
    useFindAndModify: false
})
    .then(() => console.log("MongoDB Database is Connected"))
    .catch((err) => console.log(`An error has occured in DB connection: ${err}`))

// routes
app.use(require("./routes/api.js"));

app.listen(PORT, () => {
  console.log(`App running on port ${PORT}!`);
});