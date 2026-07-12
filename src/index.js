import dotenv from "dotenv"
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import connectDB from "./db/index.js";
import app from "./app.js"


dotenv.config({
    path: "./env"
})

connectDB()
.then(()=>{
    app.on("errror",error =>{
        console.log("ERRR: ",error);
        throw error
    })
    app.listen(process.env.PORT || 3000,()=>{
        console.log(`Server running on port ${process.env.PORT}`)
    })
})
.catch((err) => {
    console.log("MongoDB connection failed !!!",err)
})


