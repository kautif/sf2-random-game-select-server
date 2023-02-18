// https://www.freecodecamp.org/news/how-to-build-a-fullstack-authentication-system-with-react-express-mongodb-heroku-and-netlify/#section-1-how-to-build-the-backend
const http = require("http");
// const app = require("./app");
const express = require("express");
const app = express();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const auth = require("./auth");

const User = require("./db/userModel");
const dbConnect = require("./db/dbConnect");
const { randomUUID } = require("crypto");
const { traceDeprecation } = require("process");
const cors = require("cors");

// app.use(cors({
//     origin: "http://localhost:3000",
//     methods: ["GET", "POST", "PUT", "DELETE"]
// }))

app.use(cors())
dbConnect();

app.use((req, res, next) => {
    // Allow to request from all origins
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content, Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    next();
})  

app.use(express.json());

const normalizePort = val => {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
        return val;
    }

    if (port >= 0) {
        return port;
    }

    return false;
}

const port = normalizePort(process.env.PORT || "4000");

app.post("/register", async (req, res) => {
    let registered = false;
    if (req.body.password.length < 8) {
        res.status(400).send({
            message: "password must be at least 8 characters long"
        })
        return;
    }

// 1/22/23: Checking whether user exists before registering user
    // Otherwise, send a message back to the user indicating that the user couldn't be created because it already exists
    User.findOne({
        email: req.body.email
    }).then(registerEmail => {
        if (req.body.email === registerEmail.email) {
            registered = true;
        }

        res.send({
            message: "This email address is already registered"
        })
    }).catch(err => {
        console.log("Error: User doesn't exist");
        if (!registered) {
            bcrypt.hash(req.body.password, 10)
            .then((hashedPw) => {
                let user = new User({
                    publicId: randomUUID(),
                    email: req.body.email,
                    password: hashedPw
                })
                user.save()
                    .then(result => {
                        res.status(201).send({
                            message: "Account Created -> Login",
                            result
                        })
                    })
                    .catch(error => {
                        res.status(500).send({
                            message: "User creation failed",
                            error
                        })
                    })
            }).catch(error => {
                if (req.body.password.length < 8) {
                    res.status(500).send({
                        message: "Password hash failed",
                        error
                    })
                }
            })
        }
    })
})

app.post("/login", (req, res) => {
    console.log("login pw: ", req.body.password);
    User.findOne({
        email: req.body.email
    })
        .then(user => {
            bcrypt.compare(req.body.password, user.password)
                .then(pwCheck => {
                    if (!pwCheck) {
                        return res.status(400).send({
                            message: "Passwords don't match"
                        })
                    } 
                    if (pwCheck) {
                        const token = jwt.sign({
                            userId: user._id,
                            userEmail: user.email
                        },
                        process.env.SECRET
                        );
                        res.status(200).send({
                            message: "Passwords match",
                            publicId: user.publicId,
                            email: user.email,
                            token: token
                        })
                    }
                })
                .catch(error => {
                    res.status(400).send({
                        message: "Passwords don't match",
                        error: error
                    })

                    console.log(error);
                })
        })
        .catch(error => {
            res.status(404).send({
                message: "email not found",
                error
            })
        })
})

app.get("/nonmember", (req, res) => {
    res.json({message: "openly accessed"});
})

app.get("/auth", auth, (req, res) => {
    const currentUser = User.findOne(req.body.email)
        .then(user => {
            // res.status(200).send(user);
            res.json({message: "authorization permitted", user});
        })
})

let newGame;
app.post("/addgame", ((req, res, next) => {
    User.findOne({
        email: req.body.localData,
        games: {
            $elemMatch: {
                name: req.body.games.name
            }
        }
    }).then(gameFound => {
        let currentGamesArr = [];
        gameFound.games.map(game => {
            currentGamesArr.push(game.name);
        })

        if (currentGamesArr.includes(req.body.games.name)) {
            console.log("user has this game");
        } else {
            newGame = req.body.games;
            console.log("user doesnt have this game");
        }
    }).catch(err => {
        console.log("Error: ", "User doesn't have this game");
        newGame = req.body.games;
        User.findOne({
            email: req.body.localData
        }).then(user => {
            user.games.push(newGame);
            user.save()
                .then(result => {
                    res.status(201).send({
                        message: `Game added to ${req.body.email}`
                    })
                }).catch(error => {
                    res.status(500).send({
                        message: `Game FAILED to add to ${req.body.email}`,
                        error
                    })
                })
        })
    })
}))

app.get("/getgames", (req, res) => {
    console.log("getgames list: ", req.query.email);
    User.findOne({
        email: req.query.email
    }).then(response => {
        console.log("getting games: ", response.games);
        res.json({
            response
        })
    })
})

app.put("/updatevotes", (req, res) => {
    User.updateOne(
        {
        email: req.body.email, "games.name": req.body.games.name},
        {
            $set: {
                "games.$.votes": req.body.games.votes
            }
        }, function (err, result) {
            if (err) {
                return res.status(500).send("update votes error: ", err.response);
            }
        console.log("Document updated");
    })
})

app.put("/updatepositions", (req,res) => {
    console.log("updatepositions reached");
    User.updateMany(
        {
            email: req.body.email
        }, {
            $set: {
                "games": req.body.games
            }
        }, function (err, result) {
            if (err) {
                return res.status(500).send("update positions error: ", err.response)
            }
        }
    )
})

app.delete("/deletegame", (req, res) => {
    User.updateOne({
        email: req.body.email
    },
    {
        $pull: {
            games: {
                name: req.body.games.name
            }
        }
    }, (err, result) => {
        if (err) throw err;
        console.log(result.modifiedCount + " game(s) deleted");
    })
})


// collection.updateOne(
//             { 
//         name: "Jane Smith"
//      }, 
//      { 
//          $set: 
//             { 
//              name: "John Doe" 
//             } 
//     }, function(err, res) {
//     console.log("Document updated");
//   });
// https://chat.openai.com/chat/a0fc7764-4120-4eee-87b7-00dd64ac3a76
    // 1/8/23: Supposedly, this can be used to provide a unique profile page for each user. Try it.
      
const errorHandler = error => {
    if (error.syscall !== "listen") {
        throw error;
    }

    const address = server.address();
    const bind = typeof address === "string" ? "pipe " + address : "port: " + port;

    switch (error.code) {
        case "EACCES":
            console.error(bind + " requires elevated privileges");
            process.exit(1);
            break;
        case "EADDRINUSE":
            console.error(bind + " is already in use");
            process.exit(1);
            break;
        default:
            throw error;
    }
}

const server = http.createServer(app);

server.on("error", errorHandler);
server.on("listening", () => {
    const address = server.address();
    const bind = typeof address === "string" ? "pipe " + address : "port " + port;
    console.log("Listening on " + bind);
})

server.listen(port);