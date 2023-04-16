const express = require("express");
require("dotenv").config();
const app = express();
const bodyParser = require("body-parser");

const { graphqlHTTP } = require("express-graphql");
const { buildSchema } = require("graphql");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Event = require("./models/event");
const User = require("./models/user");

app.use(bodyParser.json());

app.use(
  "/graphqlapi",
  graphqlHTTP({
    schema: buildSchema(`
            type Event {
                 _id : ID!
                 title : String!
                 description : String!
                 price : Float!
                 date : String!
            }
            type User {
                _id : ID!,
                email : String!
                name : String!,
                password :  String
            }
            input EventInput {
                 title : String!
                 description : String!
                 price : Float!
                 date : String!
            }
            input UserInput {
                email : String!
                name : String!,
                password :  String!
            }
            type RootQuery {
                events : [Event!]!
            }
            type RootMutation {
                createEvent(eventInput : EventInput) : Event
                createUser(userInput : UserInput) : User
            }

            schema {
                query : RootQuery
                mutation : RootMutation
            }

        `),
    rootValue: {
      events: () => {
        return Event.find()
          .then((events) => {
            return events.map((event) => {
              return { ...event._doc, _id: event.id };
            });
          })
          .catch((err) => {
            console.log(err);
            throw err;
          });
      },
      createEvent: (args) => {
        const event = new Event({
          title: args.eventInput.title,
          description: args.eventInput.description,
          price: +args.eventInput.price,
          date: new Date(args.eventInput.date),
          creator: "643c04b2634d7502d4aeefb8",
        });
        let createdEvent;
        return event
          .save()
          .then((result) => {
            createdEvent = { ...result._doc, _id: result.id };
            return User.findById("643c04b2634d7502d4aeefb8");
          })
          .then((user) => {
            if (!user) {
              throw new Error("User not found");
            }
            user.createdEvents.push(event);
            return user.save();
          })
          .then((result) => {
            return createdEvent;
          })
          .catch((err) => {
            console.log(err);
            throw err;
          });
      },
      createUser: (args) => {
        return User.findOne({ email: args.userInput.email })
          .then((user) => {
            if (user) {
              throw new Error("User Exist Already!");
            }
            return bcrypt.hash(args.userInput.password, 15);
          })
          .then((hashPassword) => {
            const user = new User({
              name: args.userInput.name,
              email: args.userInput.email,
              password: hashPassword,
            });
            return user.save();
          })
          .then((result) => {
            return { ...result._doc, password: null, _id: result.id };
          })
          .catch((err) => {
            throw err;
          });
      },
    },
    graphiql: true,
  })
);

mongoose
  .connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(8080, () => {
      console.log("Server is running on 8080 port");
    });
  })
  .catch((err) => console.log(err));
