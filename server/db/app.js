const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const User = require("./userModel");
const dbConnect = require("./dbConnect");
dbConnect();

app.post("/register", async (req, res) => {
    await bcrypt.hash(req.body.password, 10)
        .then((hashedPassword) => {
            const user = new User({
                email: req.body.email,
                password: hashedPassword
            })
            user.save()
                .then((result) => {
                    res.status(201).send({
                        message: "User created",
                        result
                    })
                })
                .catch((error) => {
                    res.status(500).send({
                        message: "User failed to create",
                        error
                    })
                })
        })
        .catch((e) => {
            res.status(500).send({
                message: "Password hash failed",
                e
            })
        })
})

module.exports = app;