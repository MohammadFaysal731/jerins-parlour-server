const  express = require('express');
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId, } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
// middleware  
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pgv2zgt.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run(){
try{
  const servicesCollection = client.db("jerins_palour").collection("services");
  const bookingCollection = client.db("jerins_palour").collection("bookings");
  const reviewCollection = client.db("jerins_palour").collection("reviews");
  const teamMembersCollection = client.db("jerins_palour").collection("team_members");
  // this api for all services
  app.get("/services", async (req, res) => {
    const services = await servicesCollection.find().toArray();
    res.send(services);
  });
  // this api for single service
  //this api for specific booking
  app.get("/services/:id", async (req, res) => {
    const id = req.params.id;
    const query ={_id:new ObjectId(id)};
    const service = await servicesCollection.findOne(query);
    res.send(service);
  });
  // this api for get all booking
  app.get('/booking',async (req,res)=>{
    const allBooking= await bookingCollection.find().toArray()
    res.send(allBooking);
  })
  // this api for all post service booking
  app.post("/booking",async (req,res)=>{
    const bookingData =req.body;
    const booking = await bookingCollection.insertOne(bookingData);
    res.send(booking); 
  })
  // this api for all reviews
  app.get("/reviews", async (req, res) => {
    const reviews = await reviewCollection.find().toArray();
    res.send(reviews);
  });
  // this api for post all reviews 
  app.post('/reviews',async(req,res)=>{
    const reviewData= req.body
    const review = await reviewCollection.insertOne(reviewData);
    res.send(review);
  })
  // this api for all team-members
  app.get("/team-members", async (req, res) => {
    const teamMembers = await teamMembersCollection.find().toArray();
    res.send(teamMembers);
  });
}
finally{

}
}
run().catch(console.dir)

app.get('/',(req,res)=>{
  res.send("Welcome to Jerins Parlour ")
});

app.listen(port,()=>{
  console.log(`Jerins Parlour is listening the prot ${port}`);
} );