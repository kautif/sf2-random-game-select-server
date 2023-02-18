const mongoose = require("mongoose");
const UserSchema = new mongoose.Schema({
    publicId: {
        type: String,
        unique: [true]
    },
    email: {
        type: String,
        required: [true, "Please provide an email address"],
        unique: [true, "Email Exists"]
    },
    password: {
        type: String,
        required: [true, "Please provide a password"],
        unique: [true]
    },
    games: {
        type: Array,
        name: String,
        img_url: String,
        votes: Number,
        unique: [true, "This Game is Already on Your Profile"]
    }
})

module.exports = mongoose.model.users || mongoose.model("users", UserSchema);