const express = require("express");
const app = express();
const cors = require("cors");
const admin = require("firebase-admin");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const objectId = require('mongodb').ObjectId;

// we-c9007-firebase-adminsdk-goagi-deda519b85.json


const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.terls.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("we-secure");
    const productsCollection=database.collection("products");
    const ordersCollection = database.collection("orders");
    const contactsCollection = database.collection("contacts");
    const usersCollection = database.collection("users");

    // Get all the offers 
    app.get("/offers", async (req, res) => {
      const allOffers = await productsCollection.find({});
      const convertedOffers = await allOffers.toArray();
      res.json(convertedOffers);
    });
    // Insert new offer 
    app.post('/offers', async (req,res)=> {
      const data = req.body;
      const result = await productsCollection.insertOne(data);
      res.json({res: 'true'});
    })
    // Delete an offer 
    app.delete('/offers/:id',async (req,res)=> {
      const id = req.params.id;
      const result = await productsCollection.deleteOne({_id:objectId(id)});
      res.json({res: ' '});
    })
    // Get clicked offer 
    app.get('/offers/:id',async (req,res)=> {
      const id = req.params.id;
      const searchedOffer = await productsCollection.findOne({_id:objectId(id)});
      res.json(searchedOffer);
    })
    // Insert new booking 
    app.post('/booked', async (req,res)=> {
      const data = req.body;
      const result = await ordersCollection.insertOne(data);
      res.json(result.acknowledged);
    })
    // Delete a booking 
    app.delete('/booked', async(req,res)=> {
      const deleteId = req.body.deleteId;
      const result = await ordersCollection.deleteOne({_id:objectId(deleteId)});
      res.json({res:' '})
    })
    // Update a booking by admin 
    app.put('/booked', async (req,res)=> {
      const updateId = req.body.updateId;
      const status = req.body.status;
      const filter = { _id: objectId(updateId)};
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: status
        },
      };
      const result = await ordersCollection.updateOne(filter, updateDoc, options);
      res.json({res:' '});
    })
    //check booked item
    app.get('/booked', async(req,res)=> {
      const userEmail = req.query.userEmail;
      const id = req.query.id;
      if(userEmail!=undefined && id!=='undefined') {
        const result = await ordersCollection.findOne({userEmail:userEmail,id:id});
        if(result) res.json({res:' '});
        else res.json({res: ''});
      }
    })
    // Get my orders 
    app.get('/allBookings/:userEmail', async (req,res)=> {
      const userEmail = req.params.userEmail;
      const result = await ordersCollection.find({userEmail:userEmail});
      const convertedOrders = await result.toArray();
      res.json(convertedOrders);
    })
    // Get all orders 
    app.get('/allBookings', async (req,res)=> {
      const result = await ordersCollection.find({});
      const convertedOrders = await result.toArray();
      res.json(convertedOrders);
    })
    // Post message 
    app.post('/contact',async (req,res)=> {
      const contactData = req.body;
      const result = await contactsCollection.insertOne(contactData);
      res.json({res: ' '});
    })

     // admin check

     app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });
    app.get("/checkAdmin/:email", async (req, res) => {
      const result = await usersCollection
        .find({ email: req.params.email })
        .toArray();
      console.log(result);
      res.send(result);
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      console.log(result);
      res.json(result);
    });
    app.put("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });
    app.put("/users/admin",verifyToken, async (req, res) => {
      const user = req.body;
      console.log('decodedEmail',req.decodedEmail)
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: "admin" } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res
          .status(403)
          .json({ message: "You do NOt HAve access To make admin" });
      }
    });
  } finally {
    // client.close();
  }
};
run().catch(console.dir);
// Home page for node server
app.get("/", (req, res) => {
  res.send("Hello from server");
});
//   Listening at port
app.listen(port, () => {
  console.log("listening", port);
});
