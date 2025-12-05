import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './database/db.js';
import cookieParser from 'cookie-parser';
import userRoute from './routes/user.route.js';

dotenv.config({ quiet: true });

connectDB();
const app = express();

const PORT = process.env.PORT || 3000;

// http://localhost:8080/api/v1/user/register

app.use(express.json());
app.use(cookieParser());

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

// apis
app.use("/api/v1/user", userRoute);

app.get("/home", (_,res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to Price History Tracker API"
    })
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});