const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId, Admin } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIP_SECRET_KEY);
// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pgv2zgt.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    const servicesCollection = client
      .db("jerins_palour")
      .collection("services");
    const bookingCollection = client.db("jerins_palour").collection("bookings");
    const reviewCollection = client.db("jerins_palour").collection("reviews");
    const teamMembersCollection = client
      .db("jerins_palour")
      .collection("team_members");
    const userCollection = client.db("jerins_palour").collection("users");
    const paymentCollection = client.db("jerins_palour").collection("payments");
    // this is verifyAdmin function
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    };

    // this api for acceptation payment
    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = booking.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });
    // this api for all services
    app.get("/services",verifyJWT, async (req, res) => {
      const allServices = await servicesCollection.find().toArray();
      res.send(allServices);
    });
    // this api for single service
    app.get("/services/:id",verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const service = await servicesCollection.findOne(query);
      res.send(service);
    });
    // this api for post all service
    app.post("/services", verifyJWT, verifyAdmin, async (req, res) => {
      const serviceData = req.body;
      const services = await servicesCollection.insertOne(serviceData);
      res.send(services);
    });
    //this api for update a service
    app.put("/services/:id",verifyJWT,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const updatedServiceData = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedServiceData,
      };
      const updatedService = await servicesCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(updatedService);
    });
    //this api for delete a service
    app.delete("/services/:id",verifyJWT,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await servicesCollection.deleteOne(query);
      res.send(result);
    });
    //  this api for get all bookings
    app.get("/bookings", verifyJWT, async (req, res) => {
      const bookings = await bookingCollection.find().toArray();
      res.send(bookings);
    });
    //this api for single booking
    app.get("/bookings/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const booking = await bookingCollection.findOne(query);
      res.send(booking);
    });
    //  this api for get specific booking
    app.get("/booking", verifyJWT,  async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const bookings = await bookingCollection.find(query).toArray();
        return res.send(bookings);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });
    // this api for all post service booking
    app.post("/bookings",verifyJWT,verifyAdmin, async (req, res) => {
      const bookingData = req.body;
      const query = {
        email: bookingData.email,
        serviceName: bookingData.serviceName,
      };
      const exits = await bookingCollection.findOne(query);
      if (exits) {
        return res.send(exits);
      } else {
        const bookings = await bookingCollection.insertOne(bookingData);
        return res.send(bookings);
      }
    });
    //this api for store payment id on booking info
    app.patch("/booking/:id",verifyJWT,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const allPayment = await paymentCollection.insertOne(payment);
      const updateBooking = await bookingCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(updateBooking);
    });
    //this api for add done booking
    app.patch("/booking-done/:id",verifyJWT,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { bookingStatus: "Done" },
      };
      const doneBooking = await bookingCollection.updateOne(filter, updateDoc);
      res.send(doneBooking);
    });
    //this api for add ongoing booking
    app.patch("/booking-ongoing/:id",verifyJWT,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { bookingStatus: "On Going" },
      };
      const doneBooking = await bookingCollection.updateOne(filter, updateDoc);
      res.send(doneBooking);
    });
    // // this api for remove done booking
    app.patch("/booking-remove/:id",verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { bookingStatus: "Pending" },
      };
      const doneBooking = await bookingCollection.updateOne(filter, updateDoc);
      res.send(doneBooking);
    });
    //this api for delete booking 
    app.delete('/booking/:id',verifyJWT, verifyAdmin, async(req,res)=>{
      const id = req.params.id;
      const query ={_id:new ObjectId(id)};
      const deletedBooking= await bookingCollection.deleteOne(query);
      res.send(deletedBooking);
    })
    // this api for all reviews
    app.get("/reviews",verifyJWT, async (req, res) => {
      const reviews = await reviewCollection.find().toArray();
      res.send(reviews);
    });
    // this api for post all reviews
    app.post("/reviews",verifyJWT, async (req, res) => {
      const reviewData = req.body;
      const review = await reviewCollection.insertOne(reviewData);
      res.send(review);
    });
    // this api for all team-members
    app.get("/team-members",verifyJWT, async (req, res) => {
      const teamMembers = await teamMembersCollection.find().toArray();
      res.send(teamMembers);
    });
    // this api for all users
    app.get("/users", verifyJWT, async (req, res) => {
      const allUsers = await userCollection.find().toArray();
      res.send(allUsers);
    });
    // this api for store all users emails
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: "30d",
        }
      );
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send({ result, token });
    });
    // this api for check user is admin
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user?.role === "admin";
      res.send({ admin: isAdmin });
    });
    // this api for make admin
    // app.patch("/user/admin/:email",verifyJWT, async (req, res) => {
    //   const email = req.params.email;
    //   const requester=req.decoded.email;
    //   const requesterAccount = await userCollection.findOne({email:requester})
    //   if(requesterAccount.role === "admin"){
    //     const filter = { email: email };
    //   const updateDoc = {
    //     $set:{role:"admin"},
    //   };
    //   const result = await userCollection.updateOne(filter, updateDoc);
    //   return res.send(result);
    //   }
    //   else{
    //    return res.status(403).send({message:"Forbidden Access"})
    //   }

    // });
    // this api for make admin. this is update version
    app.patch(
      "/user/admin/:email",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );
    //this api for delete user
    app.delete("/user/:email",verifyJWT,verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await userCollection.deleteOne(filter);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Welcome to Jerins Parlour ");
});

app.listen(port, () => {
  console.log(`Jerins Parlour is listening the prot ${port}`);
});
